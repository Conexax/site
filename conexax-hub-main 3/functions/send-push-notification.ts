import { base44 } from "@base44/sdk";

export default async function handler(request) {
  const { type, title, body, payload } = request.body;

  try {
    // Buscar todos os usuários com notificações ativas
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      isActive: true,
      notificationsEnabled: true
    });

    if (subscriptions.length === 0) {
      return { statusCode: 200, body: { message: "Nenhuma assinatura ativa" } };
    }

    let sentCount = 0;
    let failedCount = 0;

    // Enviar para cada dispositivo
    for (const subscription of subscriptions) {
      try {
        // Aqui seria integrado com FCM/APNs
        // Por enquanto apenas logamos a notificação
        await base44.asServiceRole.entities.NotificationLog.create({
          userId: subscription.userId,
          type,
          title,
          body,
          payloadJson: payload || {},
          sentAt: new Date().toISOString(),
          status: "sent"
        });

        sentCount++;
      } catch (error) {
        console.error(`Erro ao enviar para ${subscription.userId}:`, error);
        
        await base44.asServiceRole.entities.NotificationLog.create({
          userId: subscription.userId,
          type,
          title,
          body,
          payloadJson: payload || {},
          sentAt: new Date().toISOString(),
          status: "failed"
        });

        failedCount++;
      }
    }

    return {
      statusCode: 200,
      body: { 
        message: "Notificações processadas",
        sent: sentCount,
        failed: failedCount
      }
    };
  } catch (error) {
    console.error("Erro ao enviar notificações:", error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
}