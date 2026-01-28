import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Configuração de domínios e permissões
const DOMAIN_PERMISSIONS = {
  'onboarding.conexax.com.br': {
    allowedRoles: ['sdr', 'admin'],
    description: 'Módulo de Onboarding - SDRs e Admins'
  },
  'contratos.conexax.com.br': {
    allowedRoles: ['closer', 'admin'],
    description: 'Módulo de Contratos - Closers e Admins'
  }
};

export async function validateDomainAccess(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return {
        authorized: false,
        error: 'Unauthorized',
        status: 401
      };
    }

    // Extrair domínio da URL
    const url = new URL(req.url, `https://${req.headers.get('host')}`);
    const hostname = url.hostname;

    // Verificar se é um domínio restrito
    const domainConfig = DOMAIN_PERMISSIONS[hostname];
    
    if (!domainConfig) {
      // Domínio não restrito (hub ou local)
      return {
        authorized: true,
        user,
        domain: hostname
      };
    }

    // Verificar se o usuário tem permissão para este domínio
    const hasAccess = domainConfig.allowedRoles.includes(user.role);

    if (!hasAccess) {
      return {
        authorized: false,
        error: `Forbidden: ${user.role} não tem acesso a ${domainConfig.description}`,
        status: 403,
        user,
        domain: hostname
      };
    }

    return {
      authorized: true,
      user,
      domain: hostname,
      domainConfig
    };
  } catch (error) {
    return {
      authorized: false,
      error: error.message,
      status: 500
    };
  }
}

// Middleware para funções que requerem autenticação por domínio
export async function requireDomainAuth(req, requiredRoles = []) {
  const validation = await validateDomainAccess(req);

  if (!validation.authorized) {
    return Response.json(
      { error: validation.error },
      { status: validation.status || 401 }
    );
  }

  // Verificar roles específicas se fornecidas
  if (requiredRoles.length > 0 && !requiredRoles.includes(validation.user.role)) {
    return Response.json(
      { error: `Forbidden: Acesso restrito a ${requiredRoles.join(', ')}` },
      { status: 403 }
    );
  }

  return null; // Passou na validação
}