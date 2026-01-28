import { base44 } from "@base44/sdk";

export default async function handler(request) {
  const { rangeStart, rangeEnd } = request.body;
  
  let syncJob = null;
  
  try {
    // Buscar credenciais
    const connections = await base44.asServiceRole.entities.CheckoutProviderConnection.filter({
      provider: "shopify",
      isConnected: true
    });
    
    if (connections.length === 0) {
      return {
        statusCode: 400,
        body: { error: "Shopify não conectado" }
      };
    }
    
    const connection = connections[0];
    const { storeId, credentials } = connection;
    
    // Criar job de sync
    syncJob = await base44.asServiceRole.entities.ProviderSyncJob.create({
      provider: "shopify",
      status: "running",
      startedAt: new Date().toISOString(),
      rangeStart,
      rangeEnd
    });
    
    // Buscar pedidos da API do Shopify
    const apiUrl = `https://${storeId}.myshopify.com/admin/api/2024-01/orders.json?status=any&created_at_min=${rangeStart}&created_at_max=${rangeEnd}`;
    const response = await fetch(apiUrl, {
      headers: {
        "X-Shopify-Access-Token": credentials.apiKey,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API Shopify: ${response.status}`);
    }
    
    const data = await response.json();
    const orders = data.orders || [];
    
    let processed = 0;
    
    // Processar cada pedido
    for (const orderData of orders) {
      const externalOrderId = orderData.id?.toString() || orderData.order_number?.toString();
      
      // Verificar se já existe
      const existing = await base44.asServiceRole.entities.Order.filter({
        provider: "shopify",
        externalOrderId
      });
      
      const orderPayload = {
        provider: "shopify",
        externalOrderId,
        customerName: `${orderData.customer?.first_name || ""} ${orderData.customer?.last_name || ""}`.trim(),
        customerEmail: orderData.customer?.email,
        productName: orderData.line_items?.[0]?.name,
        amount: parseFloat(orderData.total_price || 0),
        status: orderData.financial_status === "paid" ? "pago" : orderData.cancelled_at ? "cancelado" : "pendente",
        paymentMethod: orderData.payment_gateway_names?.[0],
        rawData: orderData
      };
      
      if (existing.length > 0) {
        // Atualizar
        await base44.asServiceRole.entities.Order.update(existing[0].id, orderPayload);
      } else {
        // Criar
        await base44.asServiceRole.entities.Order.create(orderPayload);
      }
      
      processed++;
    }
    
    // Atualizar job como sucesso
    await base44.asServiceRole.entities.ProviderSyncJob.update(syncJob.id, {
      status: "success",
      finishedAt: new Date().toISOString(),
      itemsProcessed: processed
    });
    
    return {
      statusCode: 200,
      body: { success: true, processed }
    };
    
  } catch (error) {
    console.error("Erro ao sincronizar Shopify:", error);
    
    if (syncJob) {
      await base44.asServiceRole.entities.ProviderSyncJob.update(syncJob.id, {
        status: "error",
        finishedAt: new Date().toISOString(),
        errorMessage: error.message
      });
    }
    
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
}