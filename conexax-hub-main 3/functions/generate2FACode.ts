import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return Response.json({ error: 'userId e email são obrigatórios' }, { status: 400 });
    }

    // Gerar código OTP de 6 dígitos
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Criar hash do código
    const encoder = new TextEncoder();
    const data = encoder.encode(otpCode);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Data de expiração: 10 minutos
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidar códigos anteriores não utilizados
    const oldCodes = await base44.asServiceRole.entities.OTPCode.filter({
      userId: userId,
      isUsed: false
    });

    for (const oldCode of oldCodes) {
      await base44.asServiceRole.entities.OTPCode.update(oldCode.id, { isUsed: true });
    }

    // Criar novo código
    await base44.asServiceRole.entities.OTPCode.create({
      userId: userId,
      codeHash: codeHash,
      expiresAt: expiresAt,
      sentAt: new Date().toISOString()
    });

    // Enviar e-mail com o código
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'Código de Verificação 2FA - ConexaX',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #355340;">Código de Verificação</h2>
            <p>Seu código de autenticação de dois fatores é:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #355340; font-size: 36px; letter-spacing: 8px; margin: 0;">${otpCode}</h1>
            </div>
            <p style="color: #64748b;">Este código expira em 10 minutos.</p>
            <p style="color: #64748b; font-size: 12px;">Se você não solicitou este código, ignore este e-mail.</p>
          </div>
        `
      });

      return Response.json({ 
        success: true, 
        message: 'Código enviado com sucesso',
        expiresAt: expiresAt
      });

    } catch (emailError) {
      return Response.json({ 
        error: 'Erro ao enviar e-mail. Tente novamente.' 
      }, { status: 500 });
    }

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Erro ao gerar código' 
    }, { status: 500 });
  }
});