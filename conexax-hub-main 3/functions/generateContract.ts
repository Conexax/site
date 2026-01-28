import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      clientId, 
      planId, 
      templateId, 
      monthlyValue, 
      setupFee = 0, 
      discountPercentage = 0, 
      validityMonths, 
      startDate,
      notes 
    } = await req.json();

    if (!clientId || !planId || !templateId || !monthlyValue) {
      return Response.json({ 
        error: 'Missing required fields: clientId, planId, templateId, monthlyValue' 
      }, { status: 400 });
    }

    // Buscar dados necessários
    const [client, plan, template] = await Promise.all([
      base44.asServiceRole.entities.Client.get(clientId),
      base44.asServiceRole.entities.Plan.get(planId),
      base44.asServiceRole.entities.ContractTemplate.get(templateId)
    ]);

    if (!client || !plan || !template) {
      return Response.json({ error: 'Client, Plan or Template not found' }, { status: 404 });
    }

    // Verificar se template está ativo
    if (template.status !== 'active') {
      return Response.json({ error: 'Template is not active' }, { status: 400 });
    }

    // Gerar número do contrato
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const contractNumber = `CTR-${year}${month}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Calcular valores
    const finalValue = monthlyValue * (1 - discountPercentage / 100);
    const totalValue = finalValue * (validityMonths || 12);

    // Substituir variáveis no template
    let content = template.content;

    const variables = {
      // Dados da conta
      '{{COMPANY_NAME}}': client.company_name || '',
      '{{CNPJ}}': client.cnpj || '',
      '{{RESPONSIBLE_NAME}}': client.responsible_name || '',
      '{{EMAIL}}': client.email || '',
      '{{PHONE}}': client.phone || '',
      '{{SEGMENT}}': client.segment || '',
      
      // Dados do plano
      '{{PLAN_NAME}}': plan.name || '',
      '{{MONTHLY_VALUE}}': monthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      '{{FINAL_MONTHLY_VALUE}}': finalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      '{{SETUP_FEE}}': setupFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      '{{DISCOUNT_PERCENTAGE}}': discountPercentage.toString(),
      '{{VALIDITY_MONTHS}}': (validityMonths || 12).toString(),
      '{{TOTAL_VALUE}}': totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      
      // Dados do contrato
      '{{CONTRACT_NUMBER}}': contractNumber,
      '{{START_DATE}}': startDate || now.toISOString().split('T')[0],
      '{{GENERATION_DATE}}': now.toISOString().split('T')[0],
      '{{GENERATED_BY}}': user.full_name || user.email,
      
      // Data de vencimento
      '{{END_DATE}}': (() => {
        const start = new Date(startDate || now);
        start.setMonth(start.getMonth() + (validityMonths || 12));
        return start.toISOString().split('T')[0];
      })()
    };

    // Substituir todas as variáveis
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replaceAll(key, value);
    });

    // Criar registro de contrato gerado
    const generatedContract = await base44.asServiceRole.entities.GeneratedContract.create({
      client_id: clientId,
      template_id: templateId,
      plan_id: planId,
      contract_number: contractNumber,
      content,
      monthly_value: finalValue,
      setup_fee: setupFee,
      discount_percentage: discountPercentage,
      validity_months: validityMonths || 12,
      start_date: startDate || now.toISOString().split('T')[0],
      status: 'draft',
      generated_by: user.id,
      notes
    });

    // Criar atividade de geração
    await base44.asServiceRole.entities.Activity.create({
      title: `Contrato gerado: ${contractNumber}`,
      description: `Contrato gerado automaticamente a partir do plano "${plan.name}" para o cliente "${client.company_name}".\n\nValor: ${finalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês\nVigência: ${validityMonths || 12} meses`,
      client_id: clientId,
      type: 'commercial',
      status: 'completed',
      priority: 'medium',
      completed_date: now.toISOString().split('T')[0]
    });

    return Response.json({
      success: true,
      contract_id: generatedContract.id,
      contract_number: contractNumber,
      content
    });

  } catch (error) {
    console.error('Error generating contract:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});