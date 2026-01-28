import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || !['admin', 'gestor'].includes(user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { squad_id } = await req.json();

  if (!squad_id) {
    return Response.json({ error: 'squad_id é obrigatório' }, { status: 400 });
  }

  // Buscar squad
  const squads = await base44.asServiceRole.entities.Squad.filter({ id: squad_id });
  if (!squads || squads.length === 0) {
    return Response.json({ error: 'Squad não encontrado' }, { status: 404 });
  }

  const squad = squads[0];

  // Buscar configuração padrão
  const configs = await base44.asServiceRole.entities.SquadHealthConfig.filter({
    is_default: true,
    status: 'active'
  });

  if (!configs || configs.length === 0) {
    return Response.json({ error: 'Configuração de saúde não encontrada' }, { status: 404 });
  }

  const config = configs[0];
  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setDate(periodStart.getDate() - config.calculation_period_days);

  // 1. FATOR CAPACIDADE
  const maxCapacity = squad.max_capacity || 1;
  const currentCapacity = squad.current_capacity || 0;
  const capacityUsagePercentage = (currentCapacity / maxCapacity) * 100;
  const capacityScore = Math.max(0, 100 - capacityUsagePercentage);

  // 2. FATOR SLA
  const allClients = await base44.asServiceRole.entities.Client.list('-updated_date', 500);
  const squadClients = allClients.filter(c => c.squad_id === squad_id);
  
  let slaCompliantCount = 0;
  let slaCheckedCount = 0;

  for (const client of squadClients) {
    if (client.churn_status !== 'risk') {
      slaCompliantCount++;
    }
    slaCheckedCount++;
  }

  const slaCompliancePercentage = slaCheckedCount > 0 ? (slaCompliantCount / slaCheckedCount) * 100 : 100;
  const slaScore = Math.min(100, slaCompliancePercentage);

  // 3. FATOR VOLUME DE DEMANDAS
  const allActivities = await base44.asServiceRole.entities.Activity.list('-created_date', 1000);
  const periodActivities = allActivities.filter(a => {
    const actDate = new Date(a.created_date);
    return actDate >= periodStart && actDate <= today && 
           squadClients.some(c => c.id === a.client_id);
  });

  const totalDemands = periodActivities.length;
  const avgDemandsPerDay = totalDemands / config.calculation_period_days;
  const demandVolumeScore = Math.min(100, Math.max(0, 100 - (avgDemandsPerDay * 2)));

  // 4. FATOR BACKLOG
  const openDemands = periodActivities.filter(a => a.status === 'aberta' || a.status === 'em_andamento');
  const openCount = openDemands.length;

  let avgBacklogAgeDays = 0;
  if (openCount > 0) {
    const ages = openDemands.map(d => {
      const created = new Date(d.created_date);
      return Math.floor((today - created) / (1000 * 60 * 60 * 24));
    });
    avgBacklogAgeDays = ages.reduce((a, b) => a + b, 0) / ages.length;
  }

  const backlogScore = Math.max(0, 100 - (openCount * 5) - (avgBacklogAgeDays * 0.5));

  // Normalizar scores
  const normalizedCapacityScore = Math.min(100, Math.max(0, capacityScore));
  const normalizedSlaScore = Math.min(100, Math.max(0, slaScore));
  const normalizedDemandScore = Math.min(100, Math.max(0, demandVolumeScore));
  const normalizedBacklogScore = Math.min(100, Math.max(0, backlogScore));

  // Calcular score geral com pesos
  const totalWeight = config.capacity_weight + config.sla_weight + config.demand_volume_weight + config.backlog_weight;
  const overallScore = (
    (normalizedCapacityScore * config.capacity_weight) +
    (normalizedSlaScore * config.sla_weight) +
    (normalizedDemandScore * config.demand_volume_weight) +
    (normalizedBacklogScore * config.backlog_weight)
  ) / totalWeight;

  // Determinar status
  let healthStatus = 'healthy';
  if (overallScore < config.stretched_threshold) {
    healthStatus = 'overloaded';
  } else if (overallScore < config.healthy_threshold) {
    healthStatus = 'stretched';
  }

  // Determinar fatores contribuintes
  const scores = [
    { name: 'Capacidade', score: normalizedCapacityScore },
    { name: 'SLA', score: normalizedSlaScore },
    { name: 'Volume', score: normalizedDemandScore },
    { name: 'Backlog', score: normalizedBacklogScore }
  ];
  const sortedScores = scores.sort((a, b) => a.score - b.score);
  const contributingFactors = sortedScores.slice(0, 2).map(s => ({
    factor_name: s.name,
    score: s.score,
    impact_level: s.score < 50 ? 'negative' : s.score < 75 ? 'neutral' : 'positive'
  }));

  // Buscar score anterior para determinar tendência
  const previousScores = await base44.asServiceRole.entities.SquadHealthScore.filter({
    squad_id,
    status: 'confirmed'
  });

  let trend = 'stable';
  if (previousScores && previousScores.length > 0) {
    const lastScore = previousScores[0].overall_score;
    if (overallScore > lastScore) {
      trend = 'improving';
    } else if (overallScore < lastScore - 5) {
      trend = 'declining';
    }
  }

  const healthData = {
    squad_id,
    squad_name: squad.name,
    period_start: periodStart.toISOString().split('T')[0],
    period_end: today.toISOString().split('T')[0],
    overall_score: Math.round(overallScore * 10) / 10,
    health_status: healthStatus,
    capacity_score: Math.round(normalizedCapacityScore * 10) / 10,
    capacity_usage_percentage: Math.round(capacityUsagePercentage * 10) / 10,
    sla_score: Math.round(normalizedSlaScore * 10) / 10,
    sla_compliance_percentage: Math.round(slaCompliancePercentage * 10) / 10,
    demand_volume_score: Math.round(normalizedDemandScore * 10) / 10,
    total_demands: totalDemands,
    backlog_score: Math.round(normalizedBacklogScore * 10) / 10,
    open_demands_count: openCount,
    average_backlog_age_days: Math.round(avgBacklogAgeDays * 10) / 10,
    contributing_factors: contributingFactors,
    calculated_at: new Date().toISOString(),
    trend
  };

  // Buscar se já existe score para este squad
  const existingScores = await base44.asServiceRole.entities.SquadHealthScore.filter({
    squad_id
  });

  let result;
  if (existingScores && existingScores.length > 0) {
    result = await base44.asServiceRole.entities.SquadHealthScore.update(
      existingScores[0].id,
      healthData
    );
  } else {
    result = await base44.asServiceRole.entities.SquadHealthScore.create(healthData);
  }

  return Response.json({ success: true, score: result });
});