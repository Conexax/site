import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { leadId } = await req.json();

    if (!leadId) {
      return Response.json({ error: 'leadId obrigatório' }, { status: 400 });
    }

    // Buscar lead
    const lead = await base44.entities.Lead.get(leadId);
    if (!lead) {
      return Response.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Validar estágio
    if (lead.pipeline_stage !== 'handoff') {
      return Response.json({ error: 'Lead deve ter passado por handoff para ser fechado' }, { status: 400 });
    }

    // Validar campos obrigatórios
    if (!lead.company || !lead.email) {
      return Response.json({ error: 'Lead deve ter empresa e email para conversão' }, { status: 400 });
    }

    if (!lead.responsible_id || lead.responsible_type !== 'closer') {
      return Response.json({ error: 'Lead deve ter um closer responsável' }, { status: 400 });
    }

    // Verificar duplicidade
    let client = null;
    let wasDuplicate = false;
    let duplicateReason = null;

    // Verificar por CNPJ
    if (lead.cnpj) {
      const existingByCNPJ = await base44.asServiceRole.entities.Client.filter({ cnpj: lead.cnpj });
      if (existingByCNPJ && existingByCNPJ.length > 0) {
        client = existingByCNPJ[0];
        wasDuplicate = true;
        duplicateReason = 'cnpj';
      }
    }

    // Verificar por email
    if (!client && lead.email) {
      const existingByEmail = await base44.asServiceRole.entities.Client.filter({ email: lead.email });
      if (existingByEmail && existingByEmail.length > 0) {
        client = existingByEmail[0];
        wasDuplicate = true;
        duplicateReason = 'email';
      }
    }

    // Verificar por domínio
    if (!client && lead.company_domain) {
      const allClients = await base44.asServiceRole.entities.Client.list();
      const matchingDomain = allClients.find(c => {
        if (!c.email) return false;
        const clientDomain = c.email.split('@')[1];
        return clientDomain === lead.company_domain;
      });
      if (matchingDomain) {
        client = matchingDomain;
        wasDuplicate = true;
        duplicateReason = 'domain';
      }
    }

    // Criar cliente se não existir
    if (!client) {
      client = await base44.asServiceRole.entities.Client.create({
        company_name: lead.company,
        cnpj: lead.cnpj || null,
        responsible_name: lead.name,
        email: lead.email,
        phone: lead.phone || null,
        segment: lead.segment || null,
        status: 'onboarding',
        internal_responsible_id: lead.responsible_id,
        notes: `Convertido do lead em ${new Date().toLocaleDateString('pt-BR')}\n\nQualificação:\n- Fit: ${lead.qualification_fit || 'N/A'}\n- Tamanho: ${lead.qualification_company_size || 'N/A'}\n- Necessidade: ${lead.qualification_need || 'N/A'}\n\nNotas SDR: ${lead.qualification_notes || 'N/A'}\nNotas Handoff: ${lead.handoff_notes || 'N/A'}`
      });
    }

    // Atualizar lead
    const updateData = {
      pipeline_stage: 'fechado',
      closed_date: new Date().toISOString(),
      converted_client_id: client.id,
      conversion_date: new Date().toISOString()
    };

    await base44.entities.Lead.update(leadId, updateData);

    // Criar registro de conversão
    await base44.asServiceRole.entities.LeadConversion.create({
      lead_id: leadId,
      lead_name: lead.name,
      lead_email: lead.email,
      lead_company: lead.company,
      client_id: client.id,
      client_name: client.company_name,
      converted_by_id: user.id,
      converted_by_name: user.full_name,
      conversion_date: new Date().toISOString(),
      was_duplicate: wasDuplicate,
      duplicate_reason: duplicateReason,
      conversion_metadata: {
        qualification: {
          fit: lead.qualification_fit,
          company_size: lead.qualification_company_size,
          need: lead.qualification_need
        },
        qualified_by: lead.qualified_by_name,
        handed_off_by: lead.handoff_from_name
      }
    });

    // Iniciar onboarding automaticamente
    try {
      await base44.asServiceRole.functions.invoke('startClientOnboarding', { 
        clientId: client.id 
      });
    } catch (onboardingError) {
      console.error('Error starting onboarding:', onboardingError);
    }

    // Calcular health score inicial
    try {
      await base44.asServiceRole.functions.invoke('calculateClientHealth', { 
        clientId: client.id 
      });
    } catch (healthError) {
      console.error('Error calculating health:', healthError);
    }

    // Auditoria
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      timestamp: new Date().toISOString(),
      action: 'CREATE_CLIENT',
      entity_type: 'Client',
      entity_id: client.id,
      entity_name: client.company_name,
      result: 'success',
      metadata: {
        action_type: 'lead_conversion',
        lead_id: leadId,
        lead_name: lead.name,
        was_duplicate: wasDuplicate,
        duplicate_reason: duplicateReason,
        client_created: !wasDuplicate
      }
    });

    return Response.json({ 
      success: true, 
      lead: { ...lead, ...updateData },
      client,
      was_duplicate: wasDuplicate
    });
  } catch (error) {
    console.error('Close lead error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});