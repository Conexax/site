import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar automações ativas
    const automations = await base44.asServiceRole.entities.EmailAutomation.filter({
      is_active: true
    });

    let totalSent = 0;

    for (const automation of automations) {
      // Buscar template
      const template = await base44.asServiceRole.entities.EmailTemplate.get(automation.template_id);
      if (!template) continue;

      let targetLeads = [];

      // Processar baseado no tipo de gatilho
      if (automation.trigger_type === 'lead_stage_change' && automation.trigger_stage) {
        // Leads no estágio específico
        targetLeads = await base44.asServiceRole.entities.Lead.filter({
          pipeline_stage: automation.trigger_stage
        });
      } else if (automation.trigger_type === 'lead_created') {
        // Leads criados recentemente
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (automation.delay_days || 0));
        
        const allLeads = await base44.asServiceRole.entities.Lead.list();
        targetLeads = allLeads.filter(l => {
          if (!l.created_date) return false;
          const created = new Date(l.created_date);
          return created >= cutoffDate;
        });
      } else if (automation.trigger_type === 'lead_inactive') {
        // Leads sem atividade recente
        const inactiveDays = automation.delay_days || 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
        
        const allLeads = await base44.asServiceRole.entities.Lead.list();
        targetLeads = allLeads.filter(l => {
          if (!l.updated_date) return false;
          const updated = new Date(l.updated_date);
          return updated < cutoffDate && l.pipeline_stage !== 'fechado';
        });
      }

      // Filtrar leads com email e enviar
      const validLeads = targetLeads.filter(l => l.email);

      for (const lead of validLeads) {
        try {
          // Substituir variáveis
          let content = template.content;
          content = content.replace(/{{nome}}/g, lead.name || '');
          content = content.replace(/{{empresa}}/g, lead.company || '');
          content = content.replace(/{{email}}/g, lead.email || '');

          // Enviar email
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: lead.email,
            subject: automation.subject,
            body: content
          });

          totalSent++;
        } catch (error) {
          console.error(`Error sending to ${lead.email}:`, error);
        }
      }

      // Atualizar automação
      await base44.asServiceRole.entities.EmailAutomation.update(automation.id, {
        sent_count: (automation.sent_count || 0) + validLeads.length,
        last_run: new Date().toISOString()
      });
    }

    return Response.json({ 
      success: true,
      automations_processed: automations.length,
      emails_sent: totalSent
    });
  } catch (error) {
    console.error('Process automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});