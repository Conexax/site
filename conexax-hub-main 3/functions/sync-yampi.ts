import { base44 } from "@base44/sdk";

export default async function handler(request) {
  const { rangeStart, rangeEnd } = request.body;
  
  let syncJob = null;
  
  try {
    // Buscar credenciais
    const connections = await base44.asServiceRole.entities.CheckoutProviderConnection.filter({
      provider: "yampi",
      isConnected: true
    });
    
    if (connections.length === 0) {
      return {
        statusCode: 400,
        body: { error: "Yampi não conectado" }
      };
    }
    
    const connection = connections[0];
    const { storeId, credentials } = connection;
    
    // Criar job de sync
    syncJob = await base44.asServiceRole.entities.ProviderSyncJob.create({
      provider: "yampi",
      status: "running",
      startedAt: new Date().toISOString(),
      rangeStart,
      rangeEnd
    });
    
    // Buscar pedidos da API do Yampi
    const apiUrl = `https://api.yampi.com.br/v1/catalog/orders`;
    const response = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${credentials.apiKey}`,
        "User-Alias": storeId,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API Yampi: ${response.status}`);
    }
    
    const data = await response.json();
    const orders = data.data || [];
    
    let processed = 0;
    
    // Processar cada pedido
    for (const orderData of orders) {
      const externalOrderId = orderData.id?.toString() || orderData.order_id?.toString();
      
      // Verificar se já existe
      const existing = await base44.asServiceRole.entities.Order.filter({
        provider: "yampi",
        externalOrderId
      });
      
      const orderPayload = {
        provider: "yampi",
        externalOrderId,
        customerName: orderData.customer?.name,
        customerEmail: orderData.customer?.email,
        productName: orderData.items?.[0]?.name,
        amount: parseFloat(orderData.total || 0),
        status: orderData.status === "paid" ? "pago" : orderData.status === "refunded" ? "reembolsado" : "pendente",
        paymentMethod: orderData.payment_method,
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
    console.error("Erro ao sincronizar Yampi:", error);
    
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