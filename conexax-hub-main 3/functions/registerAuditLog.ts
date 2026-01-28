import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      action,
      entity_type,
      entity_id,
      entity_name,
      before_snapshot,
      after_snapshot,
      result = "success",
      error_message,
      metadata
    } = body;

    if (!action) {
      return Response.json({ error: 'Action is required' }, { status: 400 });
    }

    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const sanitizeSnapshot = (snapshot) => {
      if (!snapshot || typeof snapshot !== 'object') return snapshot;
      
      const sanitized = { ...snapshot };
      const sensitiveFields = ['password', 'apiKey', 'api_key', 'token', 'secret', 'codeHash'];
      
      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = '***MASKED***';
        }
      }
      
      return sanitized;
    };

    const logData = {
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      timestamp: new Date().toISOString(),
      action,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      entity_name: entity_name || null,
      before_snapshot: sanitizeSnapshot(before_snapshot),
      after_snapshot: sanitizeSnapshot(after_snapshot),
      ip_address: clientIP,
      user_agent: userAgent,
      result,
      error_message: error_message || null,
      metadata: metadata || null
    };

    const auditLog = await base44.asServiceRole.entities.AuditLog.create(logData);

    return Response.json({ success: true, log_id: auditLog.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});