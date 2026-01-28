import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || !['admin', 'financeiro'].includes(user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { seller_id, period } = await req.json();

  if (!seller_id || !period) {
    return Response.json({ error: 'seller_id e period são obrigatórios' }, { status: 400 });
  }

  // Buscar modelo de OTE do vendedor
  let oteModel = await base44.asServiceRole.entities.OTEModel.filter({
    seller_id,
    status: 'active'
  });
  
  if (!oteModel || oteModel.length === 0) {
    // Buscar modelo padrão
    oteModel = await base44.asServiceRole.entities.OTEModel.filter({
      is_default: true,
      status: 'active'
    });
  }

  if (!oteModel || oteModel.length === 0) {
    return Response.json({ error: 'Nenhum modelo de OTE encontrado' }, { status: 404 });
  }

  const model = oteModel[0];

  // Buscar contratos do vendedor no período
  const [year, month] = period.split('-');
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  const allContracts = await base44.asServiceRole.entities.Contract.list('-created_date', 1000);
  const contracts = allContracts.filter(c => 
    c.seller_id === seller_id &&
    c.status === 'active' &&
    new Date(c.start_date) >= periodStart &&
    new Date(c.start_date) <= periodEnd
  );

  // Calcular MRR vendido
  const mrrSold = contracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);

  // Calcular % da meta atingida
  const targetAchievement = (mrrSold / model.monthly_target) * 100;

  // Comissão variável base
  const variableCommissionBase = mrrSold * (model.variable_commission_rate / 100);

  // Determinar acelerador aplicado
  let acceleratorMultiplier = 1;
  const sortedAccelerators = (model.accelerators || []).sort((a, b) => 
    b.threshold_percentage - a.threshold_percentage
  );

  for (const acc of sortedAccelerators) {
    if (targetAchievement >= acc.threshold_percentage) {
      acceleratorMultiplier = acc.multiplier;
      break;
    }
  }

  const variableCommissionFinal = variableCommissionBase * acceleratorMultiplier;

  // Buscar penalidades por churn precoce
  const clients = await base44.asServiceRole.entities.Client.list('-created_date', 1000);
  const penalties = [];
  let penaltiesTotal = 0;

  for (const contract of contracts) {
    const client = clients.find(c => c.id === contract.client_id);
    if (client && client.status === 'cancelled') {
      const startDate = new Date(contract.start_date);
      const churnDate = new Date(client.updated_date);
      const daysSinceStart = Math.floor((churnDate - startDate) / (1000 * 60 * 60 * 24));

      if (daysSinceStart <= model.early_churn_period_days) {
        const penaltyAmount = (contract.monthly_value * (model.variable_commission_rate / 100) * acceleratorMultiplier) * (model.early_churn_penalty_percentage / 100);
        penalties.push({
          contract_id: contract.id,
          client_name: client.company_name,
          penalty_amount: penaltyAmount,
          churn_date: churnDate.toISOString(),
          reason: `Churn em ${daysSinceStart} dias (limite: ${model.early_churn_period_days})`
        });
        penaltiesTotal += penaltyAmount;
      }
    }
  }

  // OTE esperado (se atingir 100% da meta)
  const oteExpected = model.fixed_commission + (model.monthly_target * (model.variable_commission_rate / 100));

  // OTE realizado
  const oteRealized = model.fixed_commission + variableCommissionFinal - penaltiesTotal;

  // OTE diferença
  const oteDifference = oteRealized - oteExpected;

  // Buscar vendedor
  const seller = await base44.asServiceRole.entities.CommercialTeamMember.filter({ id: seller_id });
  const sellerName = seller && seller.length > 0 ? seller[0].name : 'Unknown';

  // Salvar ou atualizar cálculo
  const existingCalculations = await base44.asServiceRole.entities.OTECalculation.filter({
    seller_id,
    period
  });

  const calculationData = {
    seller_id,
    seller_name: sellerName,
    period,
    ote_model_id: model.id,
    monthly_target: model.monthly_target,
    mrr_sold: mrrSold,
    target_achievement_percentage: targetAchievement,
    fixed_commission: model.fixed_commission,
    variable_commission_base: variableCommissionBase,
    accelerator_applied: acceleratorMultiplier,
    variable_commission_final: variableCommissionFinal,
    penalties_total: penaltiesTotal,
    ote_expected: oteExpected,
    ote_realized: oteRealized,
    ote_difference: oteDifference,
    contracts_included: contracts.map(c => c.id),
    penalties_applied: penalties,
    calculation_date: new Date().toISOString(),
    status: 'confirmed'
  };

  let calculation;
  if (existingCalculations && existingCalculations.length > 0) {
    calculation = await base44.asServiceRole.entities.OTECalculation.update(
      existingCalculations[0].id,
      calculationData
    );
  } else {
    calculation = await base44.asServiceRole.entities.OTECalculation.create(calculationData);
  }

  return Response.json({ 
    success: true,
    calculation 
  });
});