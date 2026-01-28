import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar todos os convites pendentes
    const pendingInvites = await base44.asServiceRole.entities.UserInvite.filter({ 
      status: "pending" 
    });
    
    // Buscar todos os usuários
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userEmails = allUsers.map(u => u.email.toLowerCase());
    
    let acceptedCount = 0;
    
    // Verificar quais convites foram aceitos
    for (const invite of pendingInvites) {
      if (userEmails.includes(invite.email.toLowerCase())) {
        await base44.asServiceRole.entities.UserInvite.update(invite.id, {
          status: "accepted",
          accepted_at: new Date().toISOString()
        });
        acceptedCount++;
      }
    }
    
    return Response.json({ 
      success: true, 
      checked: pendingInvites.length,
      accepted: acceptedCount 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});