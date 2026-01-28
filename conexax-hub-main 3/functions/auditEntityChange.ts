import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { event, data, old_data, payload_too_large } = body;
    
    if (!event) {
      return Response.json({ error: 'Event data required' }, { status: 400 });
    }

    const user = await base44.auth.me().catch(() => null);
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const sanitizeData = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const sanitized = { ...obj };
      const sensitiveFields = ['password', 'apiKey', 'api_key', 'token', 'secret', 'codeHash', 'credentials'];
      
      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = '***MASKED***';
        }
      }
      return sanitized;
    };

    let actualData = data;
    let actualOldData = old_data;

    if (payload_too_large) {
      try {
        actualData = await base44.asServiceRole.entities.get(event.entity_name, event.entity_id);
      } catch (e) {
        actualData = { note: 'Payload too large, data not fetched' };
      }
    }

    const actionMap = {
      create: 'CREATE',
      update: 'UPDATE',
      delete: 'DELETE'
    };

    const entityNameMap = {
      'Client': (d) => d?.company_name || d?.id,
      'Contract': (d) => d?.contract_number || d?.id,
      'Squad': (d) => d?.name || d?.id,
      'User': (d) => d?.full_name || d?.email || d?.id,
      'CommercialTeamMember': (d) => d?.name || d?.id,
      'OperationalTeamMember': (d) => d?.name || d?.id,
      'Plan': (d) => d?.name || d?.id,
      'Lead': (d) => d?.name || d?.email || d?.id,
      'Activity': (d) => d?.title || d?.id,
      'CommissionPayment': (d) => d?.seller_name || d?.id,
    };

    const getEntityName = (entityType, entityData) => {
      const mapper = entityNameMap[entityType];
      return mapper ? mapper(entityData) : entityData?.name || entityData?.id || 'unknown';
    };

    const logData = {
      user_id: user?.id || 'system',
      user_name: user?.full_name || 'Sistema',
      user_email: user?.email || 'system@internal',
      timestamp: new Date().toISOString(),
      action: `${actionMap[event.type] || event.type.toUpperCase()}_${event.entity_name.toUpperCase()}`,
      entity_type: event.entity_name,
      entity_id: event.entity_id,
      entity_name: getEntityName(event.entity_name, actualData || actualOldData),
      before_snapshot: event.type === 'update' ? sanitizeData(actualOldData) : null,
      after_snapshot: event.type !== 'delete' ? sanitizeData(actualData) : null,
      ip_address: clientIP,
      user_agent: userAgent,
      result: 'success',
      metadata: {
        event_type: event.type,
        entity_name: event.entity_name
      }
    };

    await base44.asServiceRole.entities.AuditLog.create(logData);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Audit log error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});