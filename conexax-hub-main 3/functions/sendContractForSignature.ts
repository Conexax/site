import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { contract_id, signer_email, signer_name, platform = 'clicksign' } = await req.json();

    if (!contract_id || !signer_email || !signer_name) {
      return Response.json({ 
        error: 'Dados obrigatórios: contract_id, signer_email, signer_name' 
      }, { status: 400 });
    }

    // Buscar contrato
    const contract = await base44.asServiceRole.entities.Contract.get(contract_id);
    if (!contract) {
      return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Verificar se pode enviar
    if (contract.status === 'signed') {
      return Response.json({ error: 'Contrato já foi assinado' }, { status: 400 });
    }

    if (contract.status === 'cancelled') {
      return Response.json({ error: 'Contrato cancelado não pode ser enviado' }, { status: 400 });
    }

    // Buscar cliente
    const client = await base44.asServiceRole.entities.Client.get(contract.client_id);

    // Gerar PDF do contrato
    const pdfResponse = await base44.asServiceRole.functions.invoke('generateContractPDF', {
      contract_id: contract_id
    });

    let signatureResult;

    if (platform === 'clicksign') {
      const clicksignToken = Deno.env.get('CLICKSIGN_API_TOKEN');
      if (!clicksignToken) {
        return Response.json({ 
          error: 'Clicksign não configurado. Configure CLICKSIGN_API_TOKEN nas variáveis de ambiente.' 
        }, { status: 500 });
      }

      // Upload do documento para Clicksign
      const uploadResponse = await fetch('https://api.clicksign.com/api/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clicksignToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document: {
            path: `/contratos/contrato_${contract.id.slice(0, 8)}.pdf`,
            content_base64: pdfResponse.data.pdf_base64,
            deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
            auto_close: true,
            locale: 'pt-BR',
            sequence_enabled: false
          }
        })
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        console.error('Erro Clicksign upload:', error);
        return Response.json({ 
          error: 'Erro ao enviar documento para Clicksign',
          details: error 
        }, { status: 500 });
      }

      const uploadData = await uploadResponse.json();
      const documentKey = uploadData.document.key;

      // Criar assinante
      const signerResponse = await fetch('https://api.clicksign.com/api/v1/signers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clicksignToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signer: {
            email: signer_email,
            name: signer_name,
            documentation: client?.cnpj || '',
            birthday: '',
            has_documentation: !!client?.cnpj,
            phone_number: client?.phone || '',
            auths: ['email']
          }
        })
      });

      if (!signerResponse.ok) {
        const error = await signerResponse.text();
        console.error('Erro Clicksign signer:', error);
        return Response.json({ 
          error: 'Erro ao criar assinante',
          details: error 
        }, { status: 500 });
      }

      const signerData = await signerResponse.json();
      const signerKey = signerData.signer.key;

      // Adicionar assinante ao documento
      const addSignerResponse = await fetch(`https://api.clicksign.com/api/v1/lists?document_key=${documentKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clicksignToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          list: {
            document_key: documentKey,
            signer_key: signerKey,
            sign_as: 'sign',
            message: `Por favor, assine o contrato #${contract.contract_number || contract.id.slice(0, 8)}`
          }
        })
      });

      if (!addSignerResponse.ok) {
        const error = await addSignerResponse.text();
        console.error('Erro ao adicionar assinante:', error);
      }

      // Enviar notificação
      await fetch(`https://api.clicksign.com/api/v1/documents/${documentKey}/notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clicksignToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Olá! Segue o contrato #${contract.contract_number || contract.id.slice(0, 8)} para sua assinatura.`
        })
      });

      signatureResult = {
        platform: 'clicksign',
        document_key: documentKey,
        signer_key: signerKey,
        signature_url: `https://app.clicksign.com/sign/${documentKey}`
      };
    } else if (platform === 'docusign') {
      return Response.json({ 
        error: 'DocuSign ainda não implementado. Use Clicksign.' 
      }, { status: 400 });
    } else {
      return Response.json({ 
        error: 'Plataforma não suportada. Use: clicksign ou docusign' 
      }, { status: 400 });
    }

    // Atualizar contrato
    await base44.asServiceRole.entities.Contract.update(contract_id, {
      status: 'sent',
      sent_date: new Date().toISOString(),
      sent_by: user.id,
      sent_by_name: user.full_name,
      custom_fields: {
        ...contract.custom_fields,
        signature_platform: platform,
        signature_document_key: signatureResult.document_key,
        signature_signer_key: signatureResult.signer_key,
        signature_url: signatureResult.signature_url,
        signer_email: signer_email,
        signer_name: signer_name
      }
    });

    // Registrar auditoria
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Contract',
      entity_id: contract_id,
      action: 'SEND_FOR_SIGNATURE',
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      description: `Contrato enviado para assinatura via ${platform}`,
      metadata: {
        platform: platform,
        signer_email: signer_email,
        signer_name: signer_name,
        signature_url: signatureResult.signature_url
      }
    });

    return Response.json({
      success: true,
      message: 'Contrato enviado para assinatura com sucesso',
      signature_url: signatureResult.signature_url,
      platform: platform,
      document_key: signatureResult.document_key
    });

  } catch (error) {
    console.error('Erro ao enviar contrato:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});