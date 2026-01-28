import { base44 } from "@base44/sdk";

export default async function handler(request) {
  try {
    const payload = request.body;
    const event = payload.event || payload.type;
    
    // Criar notificação e pedido conforme o evento
    if (event === "order.paid") {
      const order = await base44.asServiceRole.entities.Order.create({
        provider: "yampi",
        externalOrderId: payload.id || payload.order_id,
        customerName: payload.customer?.name,
        customerEmail: payload.customer?.email,
        productName: payload.items?.[0]?.name,
        amount: parseFloat(payload.total || payload.amount || 0),
        status: "pago",
        paymentMethod: payload.payment_method,
        rawData: payload
      });

      // Enviar notificação push
      await fetch("/api/functions/send-push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "venda_aprovada",
          title: "Venda aprovada",
          body: `Um novo pedido foi aprovado no Yampi - ${payload.customer?.name || "Cliente"}`,
          payload: { orderId: order.id, amount: order.amount, provider: "yampi" }
        })
      });
    } else if (event === "order.refunded") {
      await fetch("/api/functions/send-push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reembolso",
          title: "Reembolso realizado",
          body: `Pedido #${payload.id || payload.order_id} foi reembolsado no Yampi`,
          payload: { orderId: payload.id || payload.order_id, provider: "yampi" }
        })
      });
    } else if (event === "order.canceled") {
      // Cancelamento não gera notificação push
    }

    return { statusCode: 200, body: { success: true } };
  } catch (error) {
    console.error("Erro no webhook Yampi:", error);
    return { statusCode: 500, body: { error: error.message } };
  }
}