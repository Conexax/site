import { base44 } from "@base44/sdk";

export default async function handler(request) {
  try {
    const payload = request.body;
    const topic = request.headers["x-shopify-topic"];
    
    if (topic === "orders/paid") {
      const order = await base44.asServiceRole.entities.Order.create({
        provider: "shopify",
        externalOrderId: payload.id?.toString() || payload.order_number,
        customerName: `${payload.customer?.first_name || ""} ${payload.customer?.last_name || ""}`.trim(),
        customerEmail: payload.customer?.email,
        productName: payload.line_items?.[0]?.name,
        amount: parseFloat(payload.total_price || 0),
        status: "pago",
        paymentMethod: payload.payment_gateway_names?.[0],
        rawData: payload
      });

      // Enviar notificação push
      await fetch("/api/functions/send-push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pagamento_confirmado",
          title: "Pagamento confirmado",
          body: `Pagamento confirmado para o cliente ${order.customerName || "Cliente"} no Shopify`,
          payload: { orderId: order.id, amount: order.amount, provider: "shopify" }
        })
      });
    } else if (topic === "refunds/create") {
      await fetch("/api/functions/send-push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reembolso",
          title: "Reembolso realizado",
          body: `Pedido #${payload.order_id} foi reembolsado no Shopify`,
          payload: { orderId: payload.order_id, provider: "shopify" }
        })
      });
    } else if (topic === "orders/cancelled") {
      // Cancelamento não gera notificação push
    }

    return { statusCode: 200, body: { success: true } };
  } catch (error) {
    console.error("Erro no webhook Shopify:", error);
    return { statusCode: 500, body: { error: error.message } };
  }
}