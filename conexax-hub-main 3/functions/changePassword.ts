import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Response.json({ 
        error: 'Todos os campos são obrigatórios' 
      }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return Response.json({ 
        error: 'As senhas não coincidem' 
      }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json({ 
        error: 'A nova senha deve ter no mínimo 8 caracteres' 
      }, { status: 400 });
    }

    // Chamar a API do Base44 para alterar senha
    const response = await fetch('https://api.base44.com/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization'),
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      await base44.functions.invoke('auditAuth', {
        action: 'CHANGE_PASSWORD',
        result: 'error',
        error_message: result.error || 'Senha atual incorreta',
        metadata: { user_id: user.id, user_name: user.full_name }
      }).catch(e => console.error('Audit failed:', e));

      return Response.json({ 
        error: result.error || 'Erro ao alterar senha. Verifique sua senha atual.' 
      }, { status: response.status });
    }

    await base44.functions.invoke('auditAuth', {
      action: 'CHANGE_PASSWORD',
      result: 'success',
      metadata: { user_id: user.id, user_name: user.full_name }
    }).catch(e => console.error('Audit failed:', e));

    return Response.json({ 
      success: true, 
      message: 'Senha alterada com sucesso' 
    });

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Erro ao processar solicitação' 
    }, { status: 500 });
  }
});