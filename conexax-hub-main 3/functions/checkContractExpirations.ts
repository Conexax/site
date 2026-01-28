import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const sixtyDaysFromNow = new Date(now);
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    // Buscar contratos assinados
    const contracts = await base44.asServiceRole.entities.Contract.filter({
      status: 'signed'
    });

    const notifications = [];
    const updates = [];

    for (const contract of contracts) {
      if (!contract.end_date) continue;

      const endDate = new Date(contract.end_date);
      const daysUntilExpiration = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));

      // Já expirou
      if (daysUntilExpiration < 0) {
        continue;
      }

      // Notificar se está a 30 ou 60 dias do vencimento
      let shouldNotify = false;
      let message = '';
      let notificationType = 'warning';

      if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
        shouldNotify = true;
        message = `Contrato #${contract.contract_number || contract.id.slice(0, 8)} vence em ${daysUntilExpiration} dias`;
        notificationType = daysUntilExpiration <= 15 ? 'error' : 'warning';
      } else if (daysUntilExpiration <= 60 && daysUntilExpiration > 30) {
        shouldNotify = true;
        message = `Contrato #${contract.contract_number || contract.id.slice(0, 8)} vence em ${daysUntilExpiration} dias`;
        notificationType = 'warning';
      }

      // Verificar se já notificou recentemente (últimas 24h)
      if (shouldNotify) {
        const lastNotification = contract.last_notification_date 
          ? new Date(contract.last_notification_date)
          : null;
        
        const oneDayAgo = new Date(now);
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        if (lastNotification && lastNotification > oneDayAgo) {
          continue; // Já notificou nas últimas 24h
        }

        // Buscar cliente
        const client = await base44.asServiceRole.entities.Client.get(contract.client_id);
        const clientName = client?.company_name || 'Cliente não identificado';

        // Buscar todos os admins
        const users = await base44.asServiceRole.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');

        // Criar notificação para cada admin
        for (const admin of admins) {
          const notification = await base44.asServiceRole.entities.Notification.create({
            user_id: admin.id,
            title: 'Contrato Próximo do Vencimento',
            message: `${message} - ${clientName}`,
            type: notificationType,
            category: 'system',
            metadata: {
              contract_id: contract.id,
              contract_number: contract.contract_number,
              client_id: contract.client_id,
              client_name: clientName,
              end_date: contract.end_date,
              days_until_expiration: daysUntilExpiration
            }
          });

          notifications.push(notification);
        }

        // Atualizar contrato com data da notificação
        await base44.asServiceRole.entities.Contract.update(contract.id, {
          last_notification_date: now.toISOString(),
          expiration_notified: true
        });

        updates.push(contract.id);
      }
    }

    return Response.json({
      success: true,
      checked: contracts.length,
      notifications_created: notifications.length,
      contracts_updated: updates.length,
      details: notifications.map(n => ({
        user_id: n.user_id,
        message: n.message
      }))
    });

  } catch (error) {
    console.error('Erro ao verificar expirações:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});