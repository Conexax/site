import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { action, result, error_message, user_email, metadata } = body;

    if (!action) {
      return Response.json({ error: 'Action required' }, { status: 400 });
    }

    const user = await base44.auth.me().catch(() => null);
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const logData = {
      user_id: user?.id || metadata?.user_id || 'anonymous',
      user_name: user?.full_name || metadata?.user_name || 'Não autenticado',
      user_email: user?.email || user_email || 'unknown',
      timestamp: new Date().toISOString(),
      action: action,
      entity_type: 'Auth',
      entity_id: user?.id || null,
      entity_name: user?.full_name || user_email || null,
      before_snapshot: null,
      after_snapshot: metadata || null,
      ip_address: clientIP,
      user_agent: userAgent,
      result: result || 'success',
      error_message: error_message || null,
      metadata: metadata || null
    };

    await base44.asServiceRole.entities.AuditLog.create(logData);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Auth audit error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});