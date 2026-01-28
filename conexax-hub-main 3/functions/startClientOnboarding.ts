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

    // Verificar se já existe onboarding
    const existing = await base44.asServiceRole.entities.ClientOnboarding.filter({
      client_id: clientId
    });

    if (existing.length > 0) {
      return Response.json({ error: 'Onboarding já existe para este cliente' }, { status: 400 });
    }

    // Calcular data esperada de conclusão (45 dias)
    const startDate = new Date();
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 45);

    // Criar onboarding
    const onboarding = await base44.asServiceRole.entities.ClientOnboarding.create({
      client_id: clientId,
      client_name: client.company_name,
      status: 'in_progress',
      start_date: startDate.toISOString().split('T')[0],
      expected_completion_date: expectedDate.toISOString().split('T')[0],
      responsible_id: client.internal_responsible_id,
      responsible_name: 'Equipe CS',
      current_phase: 'kickoff'
    });

    // Template de tarefas de onboarding
    const taskTemplates = [
      // Kickoff
      { title: 'Reunião de Kickoff', description: 'Apresentação inicial e alinhamento de expectativas', phase: 'kickoff', order: 1, days: 2 },
      { title: 'Documentação de Requisitos', description: 'Levantar e documentar requisitos do cliente', phase: 'kickoff', order: 2, days: 5 },
      { title: 'Definição de Cronograma', description: 'Estabelecer cronograma detalhado do projeto', phase: 'kickoff', order: 3, days: 7 },
      
      // Setup
      { title: 'Configuração de Ambiente', description: 'Setup técnico da plataforma', phase: 'setup', order: 4, days: 10 },
      { title: 'Integração de Sistemas', description: 'Integrar sistemas do cliente', phase: 'setup', order: 5, days: 15 },
      { title: 'Importação de Dados', description: 'Migração de dados históricos', phase: 'setup', order: 6, days: 20 },
      
      // Training
      { title: 'Treinamento Equipe', description: 'Capacitação da equipe do cliente', phase: 'training', order: 7, days: 25 },
      { title: 'Documentação e Manuais', description: 'Entrega de documentação técnica', phase: 'training', order: 8, days: 30 },
      { title: 'Testes de Aceitação', description: 'Validação com o cliente', phase: 'training', order: 9, days: 35 },
      
      // Go Live
      { title: 'Preparação Go Live', description: 'Checklist pré-lançamento', phase: 'golive', order: 10, days: 40 },
      { title: 'Lançamento', description: 'Ativação da plataforma', phase: 'golive', order: 11, days: 43 },
      { title: 'Suporte Pós Go Live', description: 'Acompanhamento inicial', phase: 'golive', order: 12, days: 45 }
    ];

    // Criar tarefas
    const tasks = await Promise.all(
      taskTemplates.map(template => {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + template.days);
        
        return base44.asServiceRole.entities.OnboardingTask.create({
          onboarding_id: onboarding.id,
          client_id: clientId,
          title: template.title,
          description: template.description,
          phase: template.phase,
          order: template.order,
          due_date: dueDate.toISOString().split('T')[0],
          responsible_id: client.internal_responsible_id,
          responsible_name: 'Equipe CS'
        });
      })
    );

    // Atualizar contador de tarefas
    await base44.asServiceRole.entities.ClientOnboarding.update(onboarding.id, {
      tasks_total: tasks.length
    });

    // Enviar email de boas-vindas
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: client.email,
        subject: `Bem-vindo à nossa plataforma, ${client.company_name}!`,
        body: `
          <h2>Olá ${client.responsible_name || 'equipe'}!</h2>
          <p>É um prazer tê-los conosco. Seu processo de onboarding já foi iniciado.</p>
          <p>Nossa equipe entrará em contato em breve para agendar a reunião de kickoff.</p>
          <p><strong>Próximos passos:</strong></p>
          <ul>
            <li>Reunião de Kickoff - ${tasks[0].due_date}</li>
            <li>Setup de ambiente</li>
            <li>Treinamento da equipe</li>
          </ul>
          <p>Qualquer dúvida, estamos à disposição!</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    return Response.json({ 
      success: true, 
      onboarding,
      tasks_created: tasks.length
    });
  } catch (error) {
    console.error('Start onboarding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});