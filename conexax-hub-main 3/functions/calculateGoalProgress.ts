import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todas as metas ativas
    const goals = await base44.asServiceRole.entities.Goal.list();
    const activeGoals = goals.filter(g => {
      const now = new Date();
      const start = new Date(g.start_date);
      const end = new Date(g.end_date);
      return now >= start && now <= end;
    });

    const results = [];

    for (const goal of activeGoals) {
      let currentValue = 0;

      // Determinar IDs para filtrar
      const targetIds = goal.target_type === 'squad' 
        ? (goal.squad_id ? [goal.squad_id] : [])
        : (goal.user_id ? [goal.user_id] : []);

      // Calcular valor atual baseado no tipo de meta
      if (goal.goal_type === 'qualified_leads') {
        const allLeads = await base44.asServiceRole.entities.Lead.list();
        const startDate = new Date(goal.start_date);
        const filteredLeads = allLeads.filter(l => {
          const isInTarget = goal.target_type === 'squad' 
            ? goal.squad_id === l.squad_id
            : goal.user_id === l.responsible_id;
          return isInTarget && l.pipeline_stage === 'qualificado' && new Date(l.qualified_date) >= startDate;
        });
        currentValue = filteredLeads.length;
      } else if (goal.goal_type === 'closed_contracts') {
        const allLeads = await base44.asServiceRole.entities.Lead.list();
        const startDate = new Date(goal.start_date);
        const filteredLeads = allLeads.filter(l => {
          const isInTarget = goal.target_type === 'squad' 
            ? goal.squad_id === l.squad_id
            : goal.user_id === l.responsible_id;
          return isInTarget && l.pipeline_stage === 'fechado' && new Date(l.closed_date) >= startDate;
        });
        currentValue = filteredLeads.length;
      } else if (goal.goal_type === 'contract_value') {
        const allContracts = await base44.asServiceRole.entities.Contract.list();
        const startDate = new Date(goal.start_date);
        const filteredContracts = allContracts.filter(c => new Date(c.created_date) >= startDate);
        
        if (goal.target_type === 'squad') {
          const squadLeads = await base44.asServiceRole.entities.Lead.filter({squad_id: goal.squad_id});
          const squadLeadIds = squadLeads.map(l => l.id);
          currentValue = filteredContracts
            .filter(c => squadLeadIds.includes(c.lead_id))
            .reduce((sum, c) => sum + (c.monthly_value || 0), 0);
        } else {
          currentValue = filteredContracts
            .filter(c => c.seller_id === goal.user_id)
            .reduce((sum, c) => sum + (c.monthly_value || 0), 0);
        }
      } else if (goal.goal_type === 'activities_completed') {
        const allActivities = await base44.asServiceRole.entities.Activity.list();
        const startDate = new Date(goal.start_date);
        const filteredActivities = allActivities.filter(a => {
          const isInTarget = goal.target_type === 'squad'
            ? goal.squad_id === a.squad_id
            : goal.user_id === a.responsible_id;
          return isInTarget && a.status === 'completed' && new Date(a.completed_date) >= startDate;
        });
        currentValue = filteredActivities.length;
      } else if (goal.goal_type === 'client_retention') {
        const allClients = await base44.asServiceRole.entities.Client.list();
        const startDate = new Date(goal.start_date);
        const filteredClients = goal.target_type === 'squad'
          ? allClients.filter(c => c.squad_id === goal.squad_id)
          : allClients.filter(c => c.internal_responsible_id === goal.user_id);
        
        const healthy = filteredClients.filter(c => c.churn_status === 'healthy').length;
        currentValue = filteredClients.length > 0 ? Math.round((healthy / filteredClients.length) * 100) : 0;
      }

      const progressPercentage = goal.target_value > 0 
        ? Math.round((currentValue / goal.target_value) * 100)
        : 0;

      let status = 'not_started';
      if (progressPercentage >= 100) {
        status = 'achieved';
      } else if (progressPercentage >= goal.risk_threshold) {
        status = 'in_progress';
      } else if (progressPercentage > 0) {
        status = 'at_risk';
      }

      // Atualizar goal
      const updatedGoal = await base44.asServiceRole.entities.Goal.update(goal.id, {
        current_value: currentValue,
        progress_percentage: progressPercentage,
        status: status
      });

      // Registrar progresso
      await base44.asServiceRole.entities.GoalProgress.create({
        goal_id: goal.id,
        goal_name: goal.name,
        user_id: goal.user_id,
        user_name: goal.user_name,
        value: currentValue,
        progress_percentage: progressPercentage,
        recorded_at: new Date().toISOString(),
        source: 'automatic'
      });

      // Notificações
      if (goal.target_type === 'user') {
        if (status === 'achieved' && !goal.notified_achieved) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: goal.user_id,
            title: `🎉 Meta Atingida: ${goal.name}`,
            message: `Parabéns! Você atingiu a meta de ${goal.target_value}!`,
            type: 'success',
            category: 'goals'
          });
          
          await base44.asServiceRole.entities.Goal.update(goal.id, {
            notified_achieved: true
          });
        } else if (status === 'at_risk' && !goal.notified_at_risk && progressPercentage > 0) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: goal.user_id,
            title: `⚠️ Meta em Risco: ${goal.name}`,
            message: `Sua meta está em risco (${progressPercentage}%). Restam ${Math.ceil((new Date(goal.end_date) - new Date()) / (1000 * 60 * 60 * 24))} dias.`,
            type: 'warning',
            category: 'goals'
          });
          
          await base44.asServiceRole.entities.Goal.update(goal.id, {
            notified_at_risk: true
          });
        }
      } else if (goal.target_type === 'squad') {
        // Notificar líder do squad
        const squad = await base44.asServiceRole.entities.Squad.get(goal.squad_id);
        if (squad?.leader_id) {
          if (status === 'achieved' && !goal.notified_achieved) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: squad.leader_id,
              title: `🎉 Meta do Squad Atingida: ${goal.name}`,
              message: `Parabéns! O squad ${squad.name} atingiu a meta de ${goal.target_value}!`,
              type: 'success',
              category: 'goals'
            });
            
            await base44.asServiceRole.entities.Goal.update(goal.id, {
              notified_achieved: true
            });
          } else if (status === 'at_risk' && !goal.notified_at_risk && progressPercentage > 0) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: squad.leader_id,
              title: `⚠️ Meta do Squad em Risco: ${goal.name}`,
              message: `A meta do squad ${squad.name} está em risco (${progressPercentage}%). Restam ${Math.ceil((new Date(goal.end_date) - new Date()) / (1000 * 60 * 60 * 24))} dias.`,
              type: 'warning',
              category: 'goals'
            });
            
            await base44.asServiceRole.entities.Goal.update(goal.id, {
              notified_at_risk: true
            });
          }
        }
      }

      results.push(updatedGoal);
    }

    return Response.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('Erro em calculateGoalProgress:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});