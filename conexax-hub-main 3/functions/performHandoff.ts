import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId, closerId, fit, segment, need, notes, nextStep } = await req.json();

    // Validações básicas
    if (!leadId || !closerId || !fit || !segment || !need || !notes || !nextStep) {
      return Response.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // Buscar o lead
    const lead = await base44.entities.Lead.read(leadId);
    if (!lead) {
      return Response.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Buscar o closer
    const closer = await base44.entities.User.read(closerId);
    if (!closer) {
      return Response.json({ error: 'Closer não encontrado' }, { status: 404 });
    }

    // Registrar dados antigos para auditoria
    const oldData = {
      pipeline_stage: lead.pipeline_stage,
      responsible_id: lead.responsible_id,
      responsible_name: lead.responsible_name,
      responsible_type: lead.responsible_type
    };

    // Atualizar o lead
    const now = new Date().toISOString();
    const updatedLead = await base44.entities.Lead.update(leadId, {
      pipeline_stage: 'qualificado',
      responsible_id: closerId,
      responsible_name: closer.full_name,
      responsible_type: 'closer',
      qualification_fit: fit,
      qualification_need: need,
      qualification_notes: notes,
      handoff_from_id: user.id,
      handoff_from_name: user.full_name,
      handoff_date: now,
      handoff_notes: notes,
      qualified_by_id: user.id,
      qualified_by_name: user.full_name,
      qualified_date: now
    });

    // Criar registro de handoff
    const handoffRecord = await base44.entities.LeadHandoff.create({
      lead_id: leadId,
      lead_name: lead.name,
      lead_company: lead.company,
      from_user_id: user.id,
      from_user_name: user.full_name,
      from_user_type: 'sdr',
      to_user_id: closerId,
      to_user_name: closer.full_name,
      to_user_type: 'closer',
      handoff_date: now,
      notes: notes,
      qualification_data: {
        fit,
        segment,
        need,
        nextStep
      }
    });

    // Registrar na auditoria
    if (base44.entities.AuditLog) {
      await base44.entities.AuditLog.create({
        entity_type: 'Lead',
        entity_id: leadId,
        action: 'handoff',
        performed_by: user.email,
        performed_by_name: user.full_name,
        timestamp: now,
        old_data: oldData,
        new_data: {
          pipeline_stage: updatedLead.pipeline_stage,
          responsible_id: updatedLead.responsible_id,
          responsible_name: updatedLead.responsible_name,
          responsible_type: updatedLead.responsible_type,
          handoff_date: updatedLead.handoff_date
        },
        details: `Handoff de ${user.full_name} para ${closer.full_name}`
      });
    }

    return Response.json({
      success: true,
      lead: updatedLead,
      handoffRecord
    });
  } catch (error) {
    console.error('Erro em performHandoff:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});