import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { 
      leadId, 
      qualification_fit, 
      qualification_company_size, 
      qualification_need, 
      qualification_notes 
    } = await req.json();

    if (!leadId) {
      return Response.json({ error: 'leadId obrigatório' }, { status: 400 });
    }

    // Buscar lead
    const lead = await base44.entities.Lead.get(leadId);
    if (!lead) {
      return Response.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Validar estágio
    if (lead.pipeline_stage !== 'captado') {
      return Response.json({ error: 'Lead deve estar no estágio "captado"' }, { status: 400 });
    }

    // Atualizar lead
    const updateData = {
      pipeline_stage: 'qualificado',
      qualification_fit,
      qualification_company_size,
      qualification_need,
      qualification_notes,
      qualified_by_id: user.id,
      qualified_by_name: user.full_name,
      qualified_date: new Date().toISOString(),
      responsible_type: 'sdr'
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
      before_snapshot: { pipeline_stage: lead.pipeline_stage },
      after_snapshot: { pipeline_stage: 'qualificado' },
      result: 'success',
      metadata: {
        action_type: 'qualify',
        qualification_data: {
          fit: qualification_fit,
          company_size: qualification_company_size,
          need: qualification_need
        }
      }
    });

    return Response.json({ success: true, lead: { ...lead, ...updateData } });
  } catch (error) {
    console.error('Qualify lead error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});