import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, code } = await req.json();

    if (!userId || !code) {
      return Response.json({ error: 'userId e código são obrigatórios' }, { status: 400 });
    }

    // Validar formato do código
    if (!/^\d{6}$/.test(code)) {
      return Response.json({ error: 'Código inválido' }, { status: 400 });
    }

    // Buscar códigos válidos do usuário
    const otpCodes = await base44.asServiceRole.entities.OTPCode.filter({
      userId: userId,
      isUsed: false
    });

    if (otpCodes.length === 0) {
      return Response.json({ error: 'Nenhum código válido encontrado' }, { status: 400 });
    }

    // Pegar o código mais recente
    const latestCode = otpCodes.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    )[0];

    // Verificar expiração
    if (new Date() > new Date(latestCode.expiresAt)) {
      await base44.asServiceRole.entities.OTPCode.update(latestCode.id, { isUsed: true });
      return Response.json({ error: 'Código expirado. Solicite um novo código.' }, { status: 400 });
    }

    // Verificar limite de tentativas
    if (latestCode.attempts >= 5) {
      await base44.asServiceRole.entities.OTPCode.update(latestCode.id, { isUsed: true });
      return Response.json({ error: 'Muitas tentativas. Solicite um novo código.' }, { status: 400 });
    }

    // Criar hash do código informado
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Incrementar tentativas
    await base44.asServiceRole.entities.OTPCode.update(latestCode.id, {
      attempts: latestCode.attempts + 1
    });

    // Validar código
    if (codeHash !== latestCode.codeHash) {
      const remainingAttempts = 5 - (latestCode.attempts + 1);
      return Response.json({ 
        error: `Código incorreto. ${remainingAttempts} tentativa(s) restante(s).` 
      }, { status: 400 });
    }

    // Marcar como usado
    await base44.asServiceRole.entities.OTPCode.update(latestCode.id, { isUsed: true });

    return Response.json({ 
      success: true, 
      message: 'Código validado com sucesso' 
    });

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Erro ao validar código' 
    }, { status: 500 });
  }
});