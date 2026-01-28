import { base44 } from "@base44/sdk";

export default async function handler(request) {
  try {
    // Buscar configuração do webhook
    const webhooks = await base44.asServiceRole.entities.WebhookEndpoint.filter({
      provider: "asaas",
      isActive: true
    });

    if (webhooks.length === 0) {
      return {
        statusCode: 404,
        body: { error: "Webhook não configurado" }
      };
    }

    const webhook = webhooks[0];

    // Validar token (se fornecido no header)
    const authToken = request.headers["asaas-access-token"];
    if (authToken && authToken !== webhook.secretToken) {
      return {
        statusCode: 403,
        body: { error: "Token inválido" }
      };
    }

    // Processar evento
    const payload = request.body;
    const eventType = payload.event || "UNKNOWN";
    const reference = payload.payment?.id || payload.id || null;

    // Salvar evento
    await base44.asServiceRole.entities.WebhookEvent.create({
      provider: "asaas",
      eventType,
      status: "received",
      reference,
      payload,
    });

    // Atualizar última recepção
    await base44.asServiceRole.entities.WebhookEndpoint.update(webhook.id, {
      lastReceivedAt: new Date().toISOString(),
    });

    // Processar evento de pagamento
    if (eventType.startsWith("PAYMENT_")) {
      const paymentData = payload.payment || payload;
      const chargeId = paymentData.id;
      
      if (chargeId) {
        // Atualizar AsaasCharge
        const existingCharges = await base44.asServiceRole.entities.AsaasCharge.filter({
          externalChargeId: chargeId
        });

        const chargeData = {
          externalChargeId: chargeId,
          customerId: paymentData.customer,
          customerName: paymentData.customerName,
          amount: parseFloat(paymentData.value || 0),
          status: paymentData.status,
          dueDate: paymentData.dueDate,
          paidAt: paymentData.clientPaymentDate || paymentData.paymentDate,
          description: paymentData.description,
          rawData: paymentData
        };

        if (existingCharges.length > 0) {
          await base44.asServiceRole.entities.AsaasCharge.update(existingCharges[0].id, chargeData);
        } else {
          await base44.asServiceRole.entities.AsaasCharge.create(chargeData);
        }

        // Atualizar BillingLink se existir
        const billingLinks = await base44.asServiceRole.entities.BillingLink.filter({
          asaasChargeId: chargeId
        });

        if (billingLinks.length > 0) {
          const billingLink = billingLinks[0];
          const newStatus = paymentData.status;
          const isPaid = newStatus === "RECEIVED" || newStatus === "CONFIRMED";

          await base44.asServiceRole.entities.BillingLink.update(billingLink.id, {
            status: newStatus,
            paidAt: isPaid ? (paymentData.clientPaymentDate || paymentData.paymentDate || new Date().toISOString()) : null
          });

          // Atualizar Order se vinculado
          if (billingLink.orderId) {
            await base44.asServiceRole.entities.Order.update(billingLink.orderId, {
              billingStatus: isPaid ? "PAID" : newStatus
            });
          }

          // Enviar notificação push se pago
          if (isPaid) {
            await fetch("/api/functions/send-push-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "pagamento_confirmado",
                title: "Pagamento confirmado",
                body: `Pagamento de R$ ${paymentData.value} confirmado no Asaas`,
                payload: { chargeId, amount: paymentData.value }
              })
            });
          }
        }
      }
    }

    return {
      statusCode: 200,
      body: { success: true, message: "Webhook recebido" }
    };
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    
    // Tentar salvar erro
    try {
      await base44.asServiceRole.entities.WebhookEvent.create({
        provider: "asaas",
        eventType: "ERROR",
        status: "error",
        payload: request.body || {},
        errorMessage: error.message,
      });
    } catch (saveError) {
      console.error("Erro ao salvar evento de erro:", saveError);
    }

    return {
      statusCode: 500,
      body: { error: "Erro ao processar webhook", details: error.message }
    };
  }
}