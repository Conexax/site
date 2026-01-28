import { base44 } from "@base44/sdk";

export default async function handler(request) {
  try {
    const payload = request.body;
    const event = payload.event_type || payload.type;
    
    if (event === "order.paid") {
      const order = await base44.asServiceRole.entities.Order.create({
        provider: "kiwify",
        externalOrderId: payload.order_id || payload.id,
        customerName: payload.customer?.full_name || payload.customer_name,
        customerEmail: payload.customer?.email || payload.customer_email,
        productName: payload.product?.name || payload.product_name,
        amount: parseFloat(payload.order_amount || payload.amount || 0),
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
          body: `Um novo pedido foi aprovado no Kiwify - ${order.customerName || "Cliente"}`,
          payload: { orderId: order.id, amount: order.amount, provider: "kiwify" }
        })
      });
    } else if (event === "order.refunded") {
      await fetch("/api/functions/send-push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reembolso",
          title: "Reembolso realizado",
          body: `Pedido #${payload.order_id || payload.id} foi reembolsado no Kiwify`,
          payload: { orderId: payload.order_id || payload.id, provider: "kiwify" }
        })
      });
    }

    return { statusCode: 200, body: { success: true } };
  } catch (error) {
    console.error("Erro no webhook Kiwify:", error);
    return { statusCode: 500, body: { error: error.message } };
  }
}