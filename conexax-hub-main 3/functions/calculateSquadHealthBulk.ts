import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Buscar todos os squads
  const squads = await base44.asServiceRole.entities.Squad.list('-created_date', 500);

  if (!squads || squads.length === 0) {
    return Response.json({ success: true, processed: 0 });
  }

  let processed = 0;
  let errors = [];

  for (const squad of squads) {
    try {
      await base44.asServiceRole.functions.invoke('calculateSquadHealth', {
        squad_id: squad.id
      });
      processed++;
    } catch (error) {
      errors.push({
        squad_id: squad.id,
        squad_name: squad.name,
        error: error.message
      });
    }
  }

  return Response.json({
    success: true,
    processed,
    errors: errors.length > 0 ? errors : undefined
  });
});