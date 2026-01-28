import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, entity, entityId, details, domain } = await req.json();

    // Registrar ação no AuditLog
    const auditEntry = await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      user_role: user.role,
      action: action,
      entity_type: entity,
      entity_id: entityId,
      domain: domain || 'hub',
      details: details || {},
      timestamp: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
    });

    return Response.json({
      success: true,
      auditId: auditEntry.id,
      timestamp: auditEntry.created_date
    });
  } catch (error) {
    console.error('Erro em auditDomainAction:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});