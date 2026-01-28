import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const clients = await base44.asServiceRole.entities.Client.list();
    
    let processed = 0;
    let errors = 0;

    for (const client of clients) {
      try {
        await base44.asServiceRole.functions.invoke('calculateChurnRisk', {
          clientId: client.id
        });
        processed++;
      } catch (error) {
        console.error(`Error calculating churn for client ${client.id}:`, error);
        errors++;
      }
    }

    return Response.json({
      success: true,
      processed,
      errors,
      total: clients.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});