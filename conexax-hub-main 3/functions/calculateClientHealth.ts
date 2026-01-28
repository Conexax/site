import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clientId } = await req.json();

    if (!clientId) {
      return Response.json({ error: 'clientId obrigatório' }, { status: 400 });
    }

    // Buscar cliente
    const client = await base44.asServiceRole.entities.Client.get(clientId);
    if (!client) {
      return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Buscar dados relacionados
    const [activities, contracts, onboarding] = await Promise.all([
      base44.asServiceRole.entities.Activity.filter({ client_id: clientId }),
      base44.asServiceRole.entities.Contract.filter({ client_id: clientId }),
      base44.asServiceRole.entities.ClientOnboarding.filter({ client_id: clientId })
    ]);

    // Calcular scores individuais
    
    // 1. Product Usage Score (baseado em atividades)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivities = activities.filter(a => {
      if (!a.created_date) return false;
      return new Date(a.created_date) > thirtyDaysAgo;
    });
    
    const productUsageScore = Math.min(100, (recentActivities.length / 10) * 100);

    // 2. Support Score (baseado em tickets/atividades de suporte)
    const supportActivities = activities.filter(a => a.type === 'operational');
    const openIssues = supportActivities.filter(a => a.status !== 'completed');
    const supportScore = Math.max(0, 100 - (openIssues.length * 15));

    // 3. Contract Score (pagamentos e status)
    let contractScore = 100;
    if (client.status === 'paused') contractScore -= 40;
    if (client.status === 'cancelled') contractScore = 0;
    
    const activeContracts = contracts.filter(c => c.status === 'active');
    if (activeContracts.length === 0) contractScore -= 30;

    // 4. Engagement Score (baseado em onboarding e atividades)
    let engagementScore = 70;
    if (onboarding.length > 0) {
      const ob = onboarding[0];
      if (ob.status === 'completed') engagementScore = 100;
      else if (ob.status === 'delayed') engagementScore = 40;
      else engagementScore = 60 + (ob.progress_percentage || 0) * 0.4;
    }

    // Overall Score (média ponderada)
    const overallScore = Math.round(
      (productUsageScore * 0.3) +
      (supportScore * 0.25) +
      (contractScore * 0.25) +
      (engagementScore * 0.2)
    );

    // Determinar status
    let healthStatus = 'healthy';
    if (overallScore < 50) healthStatus = 'critical';
    else if (overallScore < 70) healthStatus = 'at_risk';

    // Identificar fatores de risco
    const riskFactors = [];
    const recommendations = [];

    if (productUsageScore < 50) {
      riskFactors.push('Baixo uso da plataforma');
      recommendations.push('Agendar reunião de check-in para entender barreiras de uso');
    }
    if (supportScore < 60) {
      riskFactors.push('Múltiplos tickets abertos');
      recommendations.push('Priorizar resolução de tickets pendentes');
    }
    if (contractScore < 70) {
      riskFactors.push('Problemas contratuais ou de pagamento');
      recommendations.push('Entrar em contato com financeiro do cliente');
    }
    if (engagementScore < 60) {
      riskFactors.push('Baixo engajamento ou onboarding atrasado');
      recommendations.push('Acelerar processo de onboarding e treinamento');
    }

    // Usar IA para gerar insights adicionais
    let aiInsights = '';
    try {
      const aiPrompt = `
Analise os seguintes dados de saúde do cliente e forneça insights acionáveis:

Cliente: ${client.company_name}
Score Geral: ${overallScore}/100
- Uso do Produto: ${productUsageScore}
- Suporte: ${supportScore}
- Contrato: ${contractScore}
- Engajamento: ${engagementScore}

Atividades recentes: ${recentActivities.length} nos últimos 30 dias
Tickets abertos: ${openIssues.length}
Status: ${client.status}

Forneça 2-3 insights específicos e recomendações práticas em português.
      `;

      const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: aiPrompt
      });

      aiInsights = aiResponse;
    } catch (aiError) {
      console.error('AI insights error:', aiError);
      aiInsights = 'Insights de IA temporariamente indisponíveis';
    }

    // Determinar tendência (comparar com score anterior se existir)
    let trend = 'stable';
    const previousScores = await base44.asServiceRole.entities.ClientHealthScore.filter({
      client_id: clientId
    });
    
    if (previousScores.length > 0) {
      const lastScore = previousScores.sort((a, b) => 
        new Date(b.calculated_at) - new Date(a.calculated_at)
      )[0];
      
      const diff = overallScore - lastScore.overall_score;
      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'declining';
    }

    // Salvar novo score
    const healthScore = await base44.asServiceRole.entities.ClientHealthScore.create({
      client_id: clientId,
      client_name: client.company_name,
      overall_score: overallScore,
      health_status: healthStatus,
      product_usage_score: productUsageScore,
      support_score: supportScore,
      contract_score: contractScore,
      engagement_score: engagementScore,
      risk_factors: riskFactors,
      recommendations: recommendations,
      calculated_at: new Date().toISOString(),
      trend: trend,
      ai_insights: aiInsights,
      last_activity_date: recentActivities.length > 0 
        ? recentActivities[0].created_date 
        : null
    });

    // Atualizar dados de churn no cliente
    await base44.asServiceRole.entities.Client.update(clientId, {
      churn_score: 100 - overallScore,
      churn_status: healthStatus === 'healthy' ? 'healthy' : 
                    healthStatus === 'at_risk' ? 'attention' : 'risk',
      churn_factors: riskFactors,
      churn_updated_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      health_score: healthScore
    });
  } catch (error) {
    console.error('Calculate health error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});