import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { clientId } = await req.json();

    if (!clientId) {
      return Response.json({ error: 'clientId is required' }, { status: 400 });
    }

    const [client, activities, metrics, contracts] = await Promise.all([
      base44.asServiceRole.entities.Client.get(clientId),
      base44.asServiceRole.entities.Activity.filter({ client_id: clientId }),
      base44.asServiceRole.entities.Metric.filter({ client_id: clientId }),
      base44.asServiceRole.entities.Contract.filter({ client_id: clientId })
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    let score = 0;
    const factors = [];

    // Fator 1: Baixa atividade (0-30 pontos)
    const recentActivities = activities.filter(a => {
      const createdDate = new Date(a.created_date);
      return createdDate >= thirtyDaysAgo;
    });

    if (recentActivities.length === 0) {
      score += 30;
      factors.push("Nenhuma atividade nos últimos 30 dias");
    } else if (recentActivities.length < 3) {
      score += 15;
      factors.push("Baixa atividade no último mês");
    }

    // Fator 2: Atividades atrasadas (0-25 pontos)
    const overdueActivities = activities.filter(a => {
      if (a.status === 'completed') return false;
      if (!a.due_date) return false;
      return new Date(a.due_date) < now;
    });

    if (overdueActivities.length >= 5) {
      score += 25;
      factors.push(`${overdueActivities.length} atividades atrasadas`);
    } else if (overdueActivities.length >= 2) {
      score += 12;
      factors.push(`${overdueActivities.length} atividades atrasadas`);
    }

    // Fator 3: Resultados abaixo da meta (0-25 pontos)
    const recentMetrics = metrics
      .filter(m => {
        const [year, month] = m.period.split('-').map(Number);
        const metricDate = new Date(year, month - 1);
        return metricDate >= sixtyDaysAgo;
      })
      .sort((a, b) => b.period.localeCompare(a.period));

    if (recentMetrics.length > 0) {
      const latestMetric = recentMetrics[0];
      
      if (latestMetric.growth_percentage && latestMetric.growth_percentage < 0) {
        score += 25;
        factors.push(`Crescimento negativo: ${latestMetric.growth_percentage.toFixed(1)}%`);
      } else if (latestMetric.growth_percentage && latestMetric.growth_percentage < 5) {
        score += 12;
        factors.push("Crescimento abaixo do esperado");
      }

      if (latestMetric.roi && latestMetric.roi < 1) {
        score += 10;
        factors.push(`ROI baixo: ${latestMetric.roi.toFixed(2)}`);
      }
    } else {
      score += 15;
      factors.push("Métricas não reportadas recentemente");
    }

    // Fator 4: Sem interação recente (0-20 pontos)
    const hasRecentActivities = activities.some(a => {
      const updatedDate = new Date(a.updated_date);
      return updatedDate >= thirtyDaysAgo;
    });

    if (!hasRecentActivities) {
      score += 20;
      factors.push("Sem interações registradas no último mês");
    }

    // Classificação
    let status;
    if (score >= 60) {
      status = 'risk';
    } else if (score >= 30) {
      status = 'attention';
    } else {
      status = 'healthy';
    }

    // Atualizar cliente com score
    await base44.asServiceRole.entities.Client.update(clientId, {
      churn_score: score,
      churn_status: status,
      churn_factors: factors,
      churn_updated_at: now.toISOString()
    });

    return Response.json({
      success: true,
      score,
      status,
      factors
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});