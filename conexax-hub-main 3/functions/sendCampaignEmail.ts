import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'marketing')) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { campaignId } = await req.json();

    if (!campaignId) {
      return Response.json({ error: 'campaignId obrigatório' }, { status: 400 });
    }

    // Buscar campanha
    const campaign = await base44.asServiceRole.entities.EmailCampaign.get(campaignId);
    if (!campaign) {
      return Response.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    // Validar status
    if (campaign.status === 'sent') {
      return Response.json({ error: 'Campanha já foi enviada' }, { status: 400 });
    }

    // Atualizar status para sending
    await base44.asServiceRole.entities.EmailCampaign.update(campaignId, {
      status: 'sending'
    });

    // Buscar destinatários
    let leads = [];
    if (campaign.target_audience === 'all_leads') {
      leads = await base44.asServiceRole.entities.Lead.list();
    } else if (campaign.target_audience !== 'custom') {
      leads = await base44.asServiceRole.entities.Lead.filter({
        pipeline_stage: campaign.target_audience
      });
    } else if (campaign.custom_filters) {
      leads = await base44.asServiceRole.entities.Lead.filter(campaign.custom_filters);
    }

    // Filtrar leads com email
    const validLeads = leads.filter(l => l.email);

    // Criar recipients
    const recipients = await Promise.all(
      validLeads.map(lead => 
        base44.asServiceRole.entities.CampaignRecipient.create({
          campaign_id: campaignId,
          lead_id: lead.id,
          email: lead.email,
          name: lead.name,
          status: 'pending'
        })
      )
    );

    // Enviar emails
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        const lead = validLeads.find(l => l.id === recipient.lead_id);
        
        // Substituir variáveis no conteúdo
        let content = campaign.content;
        content = content.replace(/{{nome}}/g, lead.name || '');
        content = content.replace(/{{empresa}}/g, lead.company || '');
        content = content.replace(/{{email}}/g, lead.email || '');

        // Enviar email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient.email,
          subject: campaign.subject,
          body: content
        });

        // Atualizar recipient
        await base44.asServiceRole.entities.CampaignRecipient.update(recipient.id, {
          status: 'sent',
          sent_at: new Date().toISOString()
        });

        sentCount++;
      } catch (error) {
        await base44.asServiceRole.entities.CampaignRecipient.update(recipient.id, {
          status: 'failed',
          error_message: error.message
        });
        failedCount++;
      }
    }

    // Atualizar campanha
    await base44.asServiceRole.entities.EmailCampaign.update(campaignId, {
      status: 'sent',
      sent_date: new Date().toISOString(),
      recipients_count: validLeads.length,
      sent_count: sentCount
    });

    // Auditoria
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      timestamp: new Date().toISOString(),
      action: 'OTHER',
      entity_type: 'EmailCampaign',
      entity_id: campaignId,
      entity_name: campaign.name,
      result: 'success',
      metadata: {
        action_type: 'send_campaign',
        sent_count: sentCount,
        failed_count: failedCount,
        total_recipients: validLeads.length
      }
    });

    return Response.json({ 
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      total: validLeads.length
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});