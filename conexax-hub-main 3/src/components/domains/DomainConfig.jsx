// Configuração de domínios e seus módulos acessíveis
export const DOMAIN_CONFIG = {
  'onboarding.conexax.com.br': {
    name: 'Onboarding',
    type: 'onboarding',
    allowedPages: [
      'Leads',
      'Pipeline', 
      'Activities',
      'Dashboard',
      'Verify2FA',
      'Cadastro'
    ],
    allowedRoles: ['sdr', 'admin'],
    menuGroups: [
      {
        id: "dashboard",
        name: "Dashboard",
        items: [
          { name: "Visão Geral", page: "Dashboard" },
          { name: "Atividades", page: "Activities" },
        ]
      },
      {
        id: "crm",
        name: "Pipeline",
        items: [
          { name: "Pipeline", page: "Pipeline" },
          { name: "Leads", page: "Leads" },
        ]
      }
    ]
  },
  'contratos.conexax.com.br': {
    name: 'Contratos',
    type: 'contracts',
    allowedPages: [
      'Contracts',
      'ContractTemplates',
      'ContractLibrary',
      'Metrics',
      'ContractsDashboard',
      'Dashboard',
      'Verify2FA',
      'Cadastro'
    ],
    allowedRoles: ['closer', 'admin'],
    menuGroups: [
      {
        id: "dashboard",
        name: "Dashboard",
        items: [
          { name: "Visão Geral", page: "Dashboard" },
        ]
      },
      {
        id: "contratos",
        name: "Contratos",
        items: [
          { name: "Dashboard", page: "ContractsDashboard" },
          { name: "Contratos", page: "Contracts" },
          { name: "Modelos", page: "ContractTemplates" },
          { name: "Biblioteca", page: "ContractLibrary" },
          { name: "Métricas", page: "Metrics" },
        ]
      }
    ]
  },
  'hub.conexax.com.br': {
    name: 'CRM Hub',
    type: 'hub',
    allowedPages: ['*'], // Todas as páginas
    allowedRoles: ['admin'],
    menuGroups: [] // Usa o menu completo do layout original
  }
};

export function getCurrentDomain() {
  if (typeof window === 'undefined') return 'hub.conexax.com.br';
  const hostname = window.location.hostname;
  return hostname;
}

export function getDomainConfig(hostname = null) {
  const domain = hostname || getCurrentDomain();
  return DOMAIN_CONFIG[domain] || DOMAIN_CONFIG['hub.conexax.com.br'];
}

export function isDomainRestricted() {
  const domain = getCurrentDomain();
  return domain !== 'hub.conexax.com.br' && domain !== 'localhost' && !domain.includes(':');
}

export function canAccessPage(pageName, userRole) {
  const config = getDomainConfig();
  if (config.allowedPages.includes('*')) return true;
  if (!config.allowedPages.includes(pageName)) return false;
  return config.allowedRoles.includes(userRole) || config.allowedRoles.includes('admin');
}