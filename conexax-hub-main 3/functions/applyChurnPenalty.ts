import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { contract_id, client_id } = await req.json();

  if (!contract_id || !client_id) {
    return Response.json({ error: 'contract_id e client_id são obrigatórios' }, { status: 400 });
  }

  // Buscar contrato
  const contract = await base44.asServiceRole.entities.Contract.filter({ id: contract_id });
  if (!contract || contract.length === 0) {
    return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
  }

  const contractData = contract[0];
  const sellerId = contractData.seller_id;

  if (!sellerId) {
    return Response.json({ error: 'Contrato sem vendedor associado' }, { status: 400 });
  }

  // Buscar modelo OTE do vendedor
  let oteModel = await base44.asServiceRole.entities.OTEModel.filter({
    seller_id: sellerId,
    status: 'active'
  });

  if (!oteModel || oteModel.length === 0) {
    oteModel = await base44.asServiceRole.entities.OTEModel.filter({
      is_default: true,
      status: 'active'
    });
  }

  if (!oteModel || oteModel.length === 0) {
    return Response.json({ error: 'Modelo OTE não encontrado' }, { status: 404 });
  }

  const model = oteModel[0];

  // Verificar se é churn precoce
  const startDate = new Date(contractData.start_date);
  const churnDate = new Date();
  const daysSinceStart = Math.floor((churnDate - startDate) / (1000 * 60 * 60 * 24));

  if (daysSinceStart > model.early_churn_period_days) {
    return Response.json({ 
      applied: false, 
      message: 'Churn fora do período de penalidade' 
    });
  }

  // Buscar cliente
  const client = await base44.asServiceRole.entities.Client.filter({ id: client_id });
  const clientName = client && client.length > 0 ? client[0].company_name : 'Unknown';

  // Calcular penalidade
  const penaltyAmount = (contractData.monthly_value * (model.variable_commission_rate / 100)) * (model.early_churn_penalty_percentage / 100);

  // Buscar cálculo OTE do período
  const contractPeriod = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
  const calculations = await base44.asServiceRole.entities.OTECalculation.filter({
    seller_id: sellerId,
    period: contractPeriod
  });

  if (calculations && calculations.length > 0) {
    const calc = calculations[0];
    const updatedPenalties = [...(calc.penalties_applied || []), {
      contract_id,
      client_name: clientName,
      penalty_amount: penaltyAmount,
      churn_date: churnDate.toISOString(),
      reason: `Churn precoce em ${daysSinceStart} dias`
    }];

    const newPenaltiesTotal = (calc.penalties_total || 0) + penaltyAmount;
    const newOteRealized = calc.fixed_commission + calc.variable_commission_final - newPenaltiesTotal;

    await base44.asServiceRole.entities.OTECalculation.update(calc.id, {
      penalties_applied: updatedPenalties,
      penalties_total: newPenaltiesTotal,
      ote_realized: newOteRealized,
      ote_difference: newOteRealized - calc.ote_expected
    });
  }

  return Response.json({ 
    applied: true, 
    penalty_amount: penaltyAmount,
    days_since_start: daysSinceStart
  });
});