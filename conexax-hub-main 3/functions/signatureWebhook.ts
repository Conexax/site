import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    console.log('Webhook recebido:', JSON.stringify(payload, null, 2));

    // Clicksign webhook
    if (payload.event && payload.document) {
      const documentKey = payload.document.key;
      const event = payload.event.name;

      // Buscar contrato pelo document_key
      const contracts = await base44.asServiceRole.entities.Contract.filter({});
      const contract = contracts.find(c => 
        c.custom_fields?.signature_document_key === documentKey
      );

      if (!contract) {
        console.log('Contrato não encontrado para document_key:', documentKey);
        return Response.json({ 
          received: true,
          message: 'Contract not found' 
        });
      }

      let statusUpdate = {};
      let auditAction = '';
      let auditDescription = '';

      // Eventos Clicksign
      if (event === 'sign') {
        // Documento totalmente assinado
        statusUpdate = {
          status: 'signed',
          signed_date: new Date().toISOString(),
          signed_by: contract.custom_fields?.signer_email || 'external',
          signed_by_name: contract.custom_fields?.signer_name || 'Assinante',
          signed_file_url: payload.document.downloads?.signed_file_url || ''
        };
        auditAction = 'CONTRACT_SIGNED';
        auditDescription = 'Contrato assinado eletronicamente';
      } else if (event === 'close') {
        // Documento fechado (finalizado)
        statusUpdate = {
          status: 'signed',
          signed_date: new Date().toISOString(),
          signed_file_url: payload.document.downloads?.signed_file_url || contract.signed_file_url
        };
        auditAction = 'CONTRACT_CLOSED';
        auditDescription = 'Processo de assinatura concluído';
      } else if (event === 'cancel') {
        // Documento cancelado
        statusUpdate = {
          status: 'cancelled',
          cancelled_date: new Date().toISOString(),
          cancelled_by: 'system',
          cancelled_by_name: 'Sistema de Assinatura',
          cancellation_reason: 'Cancelado na plataforma de assinatura'
        };
        auditAction = 'CONTRACT_CANCELLED';
        auditDescription = 'Contrato cancelado na plataforma de assinatura';
      } else if (event === 'deadline') {
        // Prazo expirado
        statusUpdate = {
          status: 'cancelled',
          cancelled_date: new Date().toISOString(),
          cancelled_by: 'system',
          cancelled_by_name: 'Sistema',
          cancellation_reason: 'Prazo de assinatura expirado'
        };
        auditAction = 'CONTRACT_EXPIRED';
        auditDescription = 'Prazo de assinatura expirado';
      }

      if (Object.keys(statusUpdate).length > 0) {
        // Atualizar contrato
        await base44.asServiceRole.entities.Contract.update(contract.id, statusUpdate);

        // Registrar auditoria
        if (auditAction) {
          await base44.asServiceRole.entities.AuditLog.create({
            entity_type: 'Contract',
            entity_id: contract.id,
            action: auditAction,
            user_id: 'system',
            user_email: 'system@webhook',
            user_name: 'Sistema de Assinatura',
            description: auditDescription,
            metadata: {
              platform: 'clicksign',
              document_key: documentKey,
              event: event,
              webhook_payload: payload
            }
          });
        }

        // Enviar notificação para admins
        const users = await base44.asServiceRole.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');

        for (const admin of admins) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: admin.id,
            title: 'Status de Assinatura Atualizado',
            message: `Contrato #${contract.contract_number || contract.id.slice(0, 8)} - ${auditDescription}`,
            type: statusUpdate.status === 'signed' ? 'success' : 'warning',
            category: 'system',
            metadata: {
              contract_id: contract.id,
              event: event,
              platform: 'clicksign'
            }
          });
        }
      }

      return Response.json({ 
        received: true,
        contract_updated: Object.keys(statusUpdate).length > 0,
        event: event
      });
    }

    // DocuSign webhook (estrutura diferente)
    if (payload.event && payload.envelopeId) {
      return Response.json({ 
        received: true,
        message: 'DocuSign webhook not implemented yet' 
      });
    }

    return Response.json({ 
      received: true,
      message: 'Unknown webhook format' 
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});