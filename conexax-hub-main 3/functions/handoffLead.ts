import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { leadId, toUserId, notes } = await req.json();

    if (!leadId || !toUserId) {
      return Response.json({ error: 'leadId e toUserId obrigatórios' }, { status: 400 });
    }

    // Buscar lead e usuário de destino
    const [lead, toUser] = await Promise.all([
      base44.entities.Lead.get(leadId),
      base44.asServiceRole.entities.User.get(toUserId)
    ]);

    if (!lead) {
      return Response.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    if (!toUser) {
      return Response.json({ error: 'Usuário de destino não encontrado' }, { status: 404 });
    }

    // Validar estágio
    if (lead.pipeline_stage !== 'qualificado') {
      return Response.json({ error: 'Lead deve estar qualificado para handoff' }, { status: 400 });
    }

    // Criar registro de handoff
    await base44.asServiceRole.entities.LeadHandoff.create({
      lead_id: leadId,
      lead_name: lead.name,
      lead_company: lead.company,
      from_user_id: user.id,
      from_user_name: user.full_name,
      from_user_type: lead.responsible_type || 'sdr',
      to_user_id: toUserId,
      to_user_name: toUser.full_name,
      to_user_type: 'closer',
      handoff_date: new Date().toISOString(),
      notes: notes || '',
      qualification_data: {
        fit: lead.qualification_fit,
        company_size: lead.qualification_company_size,
        need: lead.qualification_need,
        notes: lead.qualification_notes
      }
    });

    // Atualizar lead
    const updateData = {
      pipeline_stage: 'handoff',
      handoff_from_id: user.id,
      handoff_from_name: user.full_name,
      handoff_date: new Date().toISOString(),
      handoff_notes: notes || '',
      responsible_id: toUserId,
      responsible_name: toUser.full_name,
      responsible_type: 'closer'
    };

    await base44.entities.Lead.update(leadId, updateData);

    // Auditoria
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      timestamp: new Date().toISOString(),
      action: 'UPDATE_LEAD',
      entity_type: 'Lead',
      entity_id: leadId,
      entity_name: lead.name,
      before_snapshot: { 
        pipeline_stage: lead.pipeline_stage,
        responsible_id: lead.responsible_id 
      },
      after_snapshot: { 
        pipeline_stage: 'handoff',
        responsible_id: toUserId 
      },
      result: 'success',
      metadata: {
        action_type: 'handoff',
        from_user: user.full_name,
        to_user: toUser.full_name
      }
    });

    return Response.json({ success: true, lead: { ...lead, ...updateData } });
  } catch (error) {
    console.error('Handoff lead error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});