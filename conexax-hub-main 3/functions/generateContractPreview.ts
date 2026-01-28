import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { plan_id, client_data } = await req.json();

  if (!plan_id || !client_data) {
    return Response.json({ error: 'plan_id e client_data são obrigatórios' }, { status: 400 });
  }

  // Buscar plano
  const plans = await base44.asServiceRole.entities.Plan.filter({ id: plan_id });
  if (!plans || plans.length === 0) {
    return Response.json({ error: 'Plano não encontrado' }, { status: 404 });
  }

  const plan = plans[0];

  // Calcular valores
  const monthlyValue = parseFloat(plan.monthly_value) || 0;
  const setupFee = parseFloat(plan.setup_fee) || 0;
  const discountPercentage = parseFloat(client_data.discount_percentage) || 0;
  const setupFeeCustom = parseFloat(client_data.setup_fee) || setupFee;

  const finalMonthlyValue = monthlyValue * (1 - discountPercentage / 100);
  const totalValue = finalMonthlyValue + setupFeeCustom;

  // Carregar template do plano
  const templates = await base44.asServiceRole.entities.ContractTemplate.filter({
    plan_id,
    status: 'active'
  });

  let templateContent = "";
  if (templates && templates.length > 0) {
    templateContent = templates[0].content;
  } else {
    // Template padrão
    templateContent = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{company_name}}
CNPJ: {{cnpj}}
Responsável: {{responsible_name}}
E-mail: {{email}}
Telefone: {{phone}}

PLANO: {{plan_name}}
Data de Início: {{start_date}}
Vigência: {{min_contract_period}} meses

VALORES:
- Valor mensal: R$ {{monthly_value}}
- Taxa de setup: R$ {{setup_fee}}
- Desconto: {{discount_percentage}}%

VALOR FINAL: R$ {{total_value}}

CONDIÇÕES COMERCIAIS
As condições comerciais estão conforme negociado e documento contratado.
    `;
  }

  // Substituir variáveis
  let content = templateContent
    .replace(/\{\{company_name\}\}/g, client_data.company_name || '')
    .replace(/\{\{cnpj\}\}/g, client_data.cnpj || '')
    .replace(/\{\{responsible_name\}\}/g, client_data.responsible_name || '')
    .replace(/\{\{email\}\}/g, client_data.email || '')
    .replace(/\{\{phone\}\}/g, client_data.phone || '')
    .replace(/\{\{plan_name\}\}/g, plan.name || '')
    .replace(/\{\{start_date\}\}/g, client_data.start_date || '')
    .replace(/\{\{min_contract_period\}\}/g, plan.min_contract_period || 12)
    .replace(/\{\{monthly_value\}\}/g, finalMonthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{setup_fee\}\}/g, setupFeeCustom.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace(/\{\{discount_percentage\}\}/g, discountPercentage)
    .replace(/\{\{total_value\}\}/g, totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

  // Dividir em seções para display
  const sections = content
    .split('\n\n')
    .filter(s => s.trim())
    .map((section, idx) => {
      const lines = section.split('\n');
      const heading = lines[0].trim();
      const contentLines = lines.slice(1);
      return {
        heading,
        content: contentLines.join('\n').trim()
      };
    });

  return Response.json({
    success: true,
    title: `Contrato - ${client_data.company_name}`,
    sections,
    monthly_value: finalMonthlyValue,
    setup_fee: setupFeeCustom,
    discount_percentage: discountPercentage,
    total_value: totalValue,
    template_content: content
  });
});