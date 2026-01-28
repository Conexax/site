import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ruleId, entityType, entityId, triggerType } = await req.json();

    // Buscar a regra
    const rule = await base44.entities.WorkflowRule.read(ruleId);
    if (!rule || !rule.is_active) {
      return Response.json({ skipped: true, reason: 'Rule not found or inactive' });
    }

    let entityData = null;
    if (entityType === 'Lead') {
      entityData = await base44.entities.Lead.read(entityId);
    } else if (entityType === 'Client') {
      entityData = await base44.entities.Client.read(entityId);
    } else if (entityType === 'Activity') {
      entityData = await base44.entities.Activity.read(entityId);
    }

    if (!entityData) {
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Executar ação
    let actionResult = null;

    if (rule.action_type === 'send_email') {
      actionResult = await sendEmailAction(base44, rule, entityData);
    } else if (rule.action_type === 'create_activity') {
      actionResult = await createActivityAction(base44, rule, entityData);
    } else if (rule.action_type === 'update_status') {
      actionResult = await updateStatusAction(base44, rule, entityData, entityType, entityId);
    } else if (rule.action_type === 'send_notification') {
      actionResult = await sendNotificationAction(base44, rule, entityData);
    }

    // Registrar execução
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.WorkflowExecution.create({
      rule_id: ruleId,
      rule_name: rule.name,
      trigger_type: triggerType,
      entity_type: entityType,
      entity_id: entityId,
      status: 'success',
      action_result: actionResult,
      execution_timestamp: now
    });

    // Atualizar contagem de execução
    await base44.asServiceRole.entities.WorkflowRule.update(ruleId, {
      execution_count: (rule.execution_count || 0) + 1,
      last_execution_date: now
    });

    return Response.json({ success: true, actionResult });
  } catch (error) {
    console.error('Erro em executeWorkflowRule:', error);

    try {
      const base44 = createClientFromRequest(req);
      const { ruleId, entityType, entityId, triggerType } = await req.json();
      
      await base44.asServiceRole.entities.WorkflowExecution.create({
        rule_id: ruleId,
        rule_name: 'Unknown',
        trigger_type: triggerType,
        entity_type: entityType,
        entity_id: entityId,
        status: 'failed',
        error_message: error.message,
        execution_timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to log execution:', e);
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendEmailAction(base44, rule, entity) {
  const template = rule.action_config.template;
  const recipientEmail = entity.email || entity.responsible_email;

  if (!recipientEmail) {
    throw new Error('No email found for entity');
  }

  const emailContent = getEmailTemplate(template, entity);

  await base44.integrations.Core.SendEmail({
    to: recipientEmail,
    subject: emailContent.subject,
    body: emailContent.body
  });

  return { type: 'email', recipient: recipientEmail, template };
}

async function createActivityAction(base44, rule, entity) {
  const config = rule.action_config;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  const activity = await base44.asServiceRole.entities.Activity.create({
    type: config.activity_type,
    title: config.title || `Acompanhamento: ${entity.name || entity.company_name}`,
    description: `Criado automaticamente pela regra: ${rule.name}`,
    scheduled_date: dueDate.toISOString(),
    priority: config.priority || 'medium',
    status: 'pending',
    lead_id: entity.id && entity.pipeline_stage ? entity.id : null,
    client_id: entity.id && !entity.pipeline_stage ? entity.id : null,
    responsible_name: 'Automação'
  });

  return { type: 'activity', activity_id: activity.id };
}

async function updateStatusAction(base44, rule, entity, entityType, entityId) {
  const newStatus = rule.action_config.new_status;

  if (entityType === 'Lead') {
    await base44.asServiceRole.entities.Lead.update(entityId, {
      pipeline_stage: newStatus
    });
  } else if (entityType === 'Client') {
    await base44.asServiceRole.entities.Client.update(entityId, {
      status: newStatus
    });
  }

  return { type: 'status_update', new_status: newStatus };
}

async function sendNotificationAction(base44, rule, entity) {
  const message = rule.action_config.message || `Notificação automática: ${rule.name}`;
  
  await base44.asServiceRole.entities.Notification.create({
    user_id: entity.responsible_id || entity.internal_responsible_id,
    title: rule.name,
    message: message,
    type: 'info',
    category: 'system'
  });

  return { type: 'notification', message };
}

function getEmailTemplate(templateType, entity) {
  const templates = {
    welcome: {
      subject: `Bem-vindo ${entity.name}!`,
      body: `Olá ${entity.name},\n\nObrigado por se tornar um lead. Entraremos em contato em breve com mais informações.\n\nAtenciosamente,\nEquipe ConexaX`
    },
    followup: {
      subject: `Acompanhamento: ${entity.name}`,
      body: `Olá ${entity.name},\n\nGostaria de acompanhar seu interesse em nossos serviços. Você teria disponibilidade para uma conversa?\n\nAtenciosamente,\nEquipe ConexaX`
    },
    reminder: {
      subject: `Lembrete de acompanhamento`,
      body: `Olá ${entity.name},\n\nEste é um lembrete de que estamos acompanhando seu interesse.\n\nAtenciosamente,\nEquipe ConexaX`
    }
  };

  return templates[templateType] || templates.followup;
}