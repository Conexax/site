import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = await req.json();

    // Só processar updates de status para "qualificado"
    if (event.type !== 'update' || !data || !old_data) {
      return Response.json({ success: true, message: 'Not applicable' });
    }

    const statusChanged = old_data.status !== data.status;
    const isClosed = data.status === 'qualificado';

    if (!statusChanged || !isClosed) {
      return Response.json({ success: true, message: 'Status not changed to closed' });
    }

    // Verificar se já foi convertido
    if (data.converted_client_id) {
      return Response.json({ 
        success: true, 
        message: 'Lead already converted',
        client_id: data.converted_client_id 
      });
    }

    // Buscar cliente existente por email
    let existingClient = null;
    if (data.email) {
      const clients = await base44.asServiceRole.entities.Client.filter({ email: data.email });
      existingClient = clients[0];
    }

    let clientId;

    if (existingClient) {
      // Vincular ao cliente existente
      clientId = existingClient.id;
      
      await base44.asServiceRole.entities.Lead.update(data.id, {
        converted_client_id: clientId,
        conversion_date: new Date().toISOString()
      });

    } else {
      // Criar novo cliente
      const clientData = {
        company_name: data.name || data.formName || "Cliente",
        email: data.email,
        phone: data.phone,
        responsible_name: data.name,
        segment: data.segment,
        status: "onboarding",
        notes: `Convertido do lead ${data.id}\nOrigem: ${data.source || 'Desconhecida'}\nFormulário: ${data.formName || '-'}\n\nMensagem original:\n${data.message || 'Sem mensagem'}`
      };

      const newClient = await base44.asServiceRole.entities.Client.create(clientData);
      clientId = newClient.id;

      // Atualizar lead com vínculo
      await base44.asServiceRole.entities.Lead.update(data.id, {
        converted_client_id: clientId,
        conversion_date: new Date().toISOString()
      });

      // Criar atividade de conversão
      await base44.asServiceRole.entities.Activity.create({
        title: "Lead convertido para cliente",
        description: `Lead "${data.name}" (${data.email}) convertido automaticamente para cliente.\n\nOrigem: ${data.source}\nFormulário: ${data.formName || 'N/A'}`,
        client_id: clientId,
        type: "commercial",
        status: "completed",
        priority: "medium",
        completed_date: new Date().toISOString().split('T')[0]
      });
    }

    return Response.json({
      success: true,
      client_id: clientId,
      created_new: !existingClient,
      message: existingClient ? 'Vinculado a cliente existente' : 'Novo cliente criado'
    });

  } catch (error) {
    console.error('Error converting lead:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});