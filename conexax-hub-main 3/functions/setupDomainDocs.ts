// DOCUMENTAÇÃO DE SETUP - Subdomínios Isolados
// Este arquivo contém instruções para configurar os subdomínios isolados

const SETUP_GUIDE = `
═══════════════════════════════════════════════════════════════════════════════
 GUIA DE IMPLEMENTAÇÃO - SUBDOMÍNIOS ISOLADOS
═══════════════════════════════════════════════════════════════════════════════

## 1. VARIÁVEIS DE AMBIENTE

### Para onboarding.conexax.com.br
Criar arquivo: .env.production.onboarding
\`\`\`
VITE_APP_DOMAIN=onboarding.conexax.com.br
VITE_APP_NAME=Onboarding CRM
VITE_ALLOWED_ROLES=sdr,admin
VITE_API_DOMAIN=onboarding.conexax.com.br
VITE_SSL_ENABLED=true
VITE_SESSION_DOMAIN=onboarding.conexax.com.br
VITE_APP_URL=https://onboarding.conexax.com.br
VITE_BUILD_TARGET=onboarding
\`\`\`

### Para contratos.conexax.com.br
Criar arquivo: .env.production.contracts
\`\`\`
VITE_APP_DOMAIN=contratos.conexax.com.br
VITE_APP_NAME=Gestão de Contratos
VITE_ALLOWED_ROLES=closer,admin
VITE_API_DOMAIN=contratos.conexax.com.br
VITE_SSL_ENABLED=true
VITE_SESSION_DOMAIN=contratos.conexax.com.br
VITE_APP_URL=https://contratos.conexax.com.br
VITE_BUILD_TARGET=contracts
\`\`\`

## 2. BUILD SCRIPTS (package.json)

Adicionar scripts:
\`\`\`json
{
  "scripts": {
    "build:onboarding": "VITE_APP_DOMAIN=onboarding.conexax.com.br VITE_BUILD_TARGET=onboarding vite build --outDir dist-onboarding",
    "build:contracts": "VITE_APP_DOMAIN=contratos.conexax.com.br VITE_BUILD_TARGET=contracts vite build --outDir dist-contracts",
    "build:all-domains": "npm run build:onboarding && npm run build:contracts && npm run build",
    "deploy:onboarding": "docker build -f docker/Dockerfile.onboarding -t conexax/onboarding:latest . && docker push conexax/onboarding:latest",
    "deploy:contracts": "docker build -f docker/Dockerfile.contracts -t conexax/contracts:latest . && docker push conexax/contracts:latest",
    "docker:up-domains": "docker-compose -f docker/docker-compose.domains.yml up -d",
    "docker:down-domains": "docker-compose -f docker/docker-compose.domains.yml down"
  }
}
\`\`\`

## 3. CONFIGURAÇÃO NGINX

Arquivo: nginx/domain-config.conf

Os subdomínios precisam de configurações separadas no Nginx:
- onboarding.conexax.com.br → rota /var/www/onboarding
- contratos.conexax.com.br → rota /var/www/contracts

SSL/TLS:
- Certificado único: /etc/letsencrypt/live/conexax.com.br/
- Protocolos: TLSv1.2, TLSv1.3
- Headers de segurança: HSTS, X-Content-Type-Options, X-Frame-Options

## 4. DOCKER COMPOSE

Arquivo: docker/docker-compose.domains.yml

Contêineres:
- onboarding-app (porta 3001)
- contracts-app (porta 3002)
- nginx-proxy (portas 80, 443)

Rede: conexax-network (ponte)

## 5. DOCKERFILES

Dockerfile.onboarding:
- Build com VITE_BUILD_TARGET=onboarding
- Base: nginx:alpine
- Copia: nginx/onboarding.conf

Dockerfile.contracts:
- Build com VITE_BUILD_TARGET=contracts
- Base: nginx:alpine
- Copia: nginx/contracts.conf

═══════════════════════════════════════════════════════════════════════════════
 DEPLOY EM PRODUÇÃO
═══════════════════════════════════════════════════════════════════════════════

### 1. Certificado SSL (Let's Encrypt)
\`\`\`bash
certbot certonly --standalone -d conexax.com.br -d onboarding.conexax.com.br -d contratos.conexax.com.br
\`\`\`

### 2. Build separados
\`\`\`bash
npm run build:onboarding  # Gera dist-onboarding/
npm run build:contracts   # Gera dist-contracts/
\`\`\`

### 3. Deploy Docker
\`\`\`bash
npm run deploy:onboarding  # Push para docker registry
npm run deploy:contracts   # Push para docker registry
docker-compose -f docker/docker-compose.domains.yml up -d
\`\`\`

### 4. Configuração DNS
Apontar para o servidor principal:
- onboarding.conexax.com.br → 192.168.x.x (A record)
- contratos.conexax.com.br → 192.168.x.x (A record)

═══════════════════════════════════════════════════════════════════════════════
`;

console.log(SETUP_GUIDE);

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return new Response(SETUP_GUIDE, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});