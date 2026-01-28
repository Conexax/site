import { base44 } from "@base44/sdk";

export default async function handler(request) {
  const { rangeStart, rangeEnd } = request.body;
  
  let syncJob = null;
  
  try {
    // Buscar credenciais
    const providers = await base44.asServiceRole.entities.IntegrationProvider.filter({
      name: "asaas",
      isConnected: true
    });
    
    if (providers.length === 0) {
      return {
        statusCode: 400,
        body: { error: "Asaas não conectado" }
      };
    }
    
    const provider = providers[0];
    const { apiKey, environment } = provider;
    const baseUrl = environment === "production" 
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";
    
    // Criar job de sync
    syncJob = await base44.asServiceRole.entities.ProviderSyncJob.create({
      provider: "asaas",
      status: "running",
      startedAt: new Date().toISOString(),
      rangeStart,
      rangeEnd
    });
    
    // Buscar cobranças da API do Asaas
    const apiUrl = `${baseUrl}/payments?dateCreated[ge]=${rangeStart}&dateCreated[le]=${rangeEnd}&limit=100`;
    const response = await fetch(apiUrl, {
      headers: {
        "access_token": apiKey,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API Asaas: ${response.status}`);
    }
    
    const data = await response.json();
    const charges = data.data || [];
    
    let processed = 0;
    
    // Processar cada cobrança
    for (const chargeData of charges) {
      const externalChargeId = chargeData.id;
      
      // Verificar se já existe
      const existing = await base44.asServiceRole.entities.AsaasCharge.filter({
        externalChargeId
      });
      
      const chargePayload = {
        externalChargeId,
        customerId: chargeData.customer,
        customerName: chargeData.customerName,
        amount: parseFloat(chargeData.value || 0),
        status: chargeData.status,
        dueDate: chargeData.dueDate,
        paidAt: chargeData.clientPaymentDate || chargeData.paymentDate,
        description: chargeData.description,
        rawData: chargeData
      };
      
      if (existing.length > 0) {
        // Atualizar
        await base44.asServiceRole.entities.AsaasCharge.update(existing[0].id, chargePayload);
      } else {
        // Criar
        await base44.asServiceRole.entities.AsaasCharge.create(chargePayload);
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
    console.error("Erro ao sincronizar Asaas:", error);
    
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