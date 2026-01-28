import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Simula assinatura eletrônica ou integra com serviço real
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, signature_id, contract_id, signer_email, signed_file_url } = await req.json();

    if (action === 'send') {
      // Enviar link de assinatura
      const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const signature = await base44.asServiceRole.entities.ContractSignature.update(
        signature_id,
        {
          status: 'sent',
          sent_date: new Date().toISOString(),
          expiration_date: expirationDate.toISOString().split('T')[0],
          // Link simulado
          signature_link: `https://app.conexax.com.br/sign/${signature_id}?token=${generateToken()}`
        }
      );

      // Enviar email (simulado)
      await base44.integrations.Core.SendEmail({
        to: signer_email,
        subject: `ConexaX: Assine seu contrato agora`,
        body: `
          <h2>Contrato para Assinatura</h2>
          <p>Você foi convidado a assinar um contrato.</p>
          <p><a href="${signature.signature_link}">Clique aqui para assinar</a></p>
          <p>O link expira em 30 dias.</p>
        `
      });

      return Response.json({ success: true, signature });
    }

    if (action === 'sign') {
      // Marcar como assinado (simulado)
      const signature = await base44.asServiceRole.entities.ContractSignature.update(
        signature_id,
        {
          status: 'signed',
          signed_date: new Date().toISOString(),
          signed_file_url: signed_file_url || '',
          signature_timestamp: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          metadata: {
            user_agent: req.headers.get('user-agent'),
            signed_at: new Date().toISOString()
          }
        }
      );

      // Atualizar contrato para assinado
      await base44.asServiceRole.entities.Contract.update(contract_id, {
        status: 'signed',
        signed_date: new Date().toISOString(),
        signed_by: user.id,
        signed_by_name: user.full_name,
        signed_file_url: signed_file_url || ''
      });

      // Enviar confirmação
      await base44.integrations.Core.SendEmail({
        to: signer_email,
        subject: 'ConexaX: Contrato assinado com sucesso',
        body: `
          <h2>Contrato Assinado</h2>
          <p>Seu contrato foi assinado com sucesso!</p>
          <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
        `
      });

      return Response.json({ success: true, signature });
    }

    if (action === 'view') {
      // Registrar visualização
      const signature = await base44.asServiceRole.entities.ContractSignature.update(
        signature_id,
        {
          status: 'viewed',
          viewed_date: new Date().toISOString()
        }
      );

      return Response.json({ success: true, signature });
    }

    if (action === 'remind') {
      // Enviar lembrete
      const signature = await base44.asServiceRole.entities.ContractSignature.get(signature_id);
      
      await base44.integrations.Core.SendEmail({
        to: signer_email,
        subject: 'ConexaX: Lembrete - Assine seu contrato',
        body: `
          <h2>Lembrete: Contrato Pendente de Assinatura</h2>
          <p>Você ainda tem ${30 - Math.floor((Date.now() - new Date(signature.sent_date).getTime()) / (24 * 60 * 60 * 1000))} dias para assinar.</p>
          <p><a href="${signature.signature_link}">Assinar agora</a></p>
        `
      });

      const updated = await base44.asServiceRole.entities.ContractSignature.update(
        signature_id,
        {
          reminders_sent: (signature.reminders_sent || 0) + 1
        }
      );

      return Response.json({ success: true, updated });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Erro em processContractSignature:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateToken() {
  return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}