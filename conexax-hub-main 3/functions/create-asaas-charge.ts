import { base44 } from "@base44/sdk";

export default async function handler(request) {
  const { customerId, amount, dueDate, description, orderId } = request.body;

  try {
    // Buscar customer
    const customer = await base44.asServiceRole.entities.Customer.filter({ id: customerId });
    if (customer.length === 0) {
      return { statusCode: 400, body: { error: "Cliente não encontrado" } };
    }

    const customerData = customer[0];

    // Validar contato
    if (!customerData.email && !customerData.phone) {
      return { 
        statusCode: 400, 
        body: { error: "Cliente precisa ter email ou telefone cadastrado" } 
      };
    }

    // Verificar cobrança pendente
    const existingCharges = await base44.asServiceRole.entities.BillingLink.filter({
      customerId,
      status: "PENDING"
    });

    if (existingCharges.length > 0) {
      return {
        statusCode: 400,
        body: { error: "Já existe uma cobrança pendente para este cliente." }
      };
    }

    // Buscar credenciais Asaas
    const providers = await base44.asServiceRole.entities.IntegrationProvider.filter({
      name: "asaas",
      isConnected: true
    });

    if (providers.length === 0) {
      return { statusCode: 400, body: { error: "Asaas não conectado" } };
    }

    const { apiKey, environment } = providers[0];
    const baseUrl = environment === "production"
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";

    // Criar ou buscar customer no Asaas
    let asaasCustomerId = customerData.asaasCustomerId;

    if (!asaasCustomerId) {
      const createCustomerResponse = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers: {
          "access_token": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          cpfCnpj: customerData.cpfCnpj
        })
      });

      if (!createCustomerResponse.ok) {
        throw new Error("Erro ao criar cliente no Asaas");
      }

      const asaasCustomer = await createCustomerResponse.json();
      asaasCustomerId = asaasCustomer.id;

      // Atualizar customer com ID do Asaas
      await base44.asServiceRole.entities.Customer.update(customerId, {
        asaasCustomerId
      });
    }

    // Criar cobrança no Asaas
    const chargeResponse = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "access_token": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: amount,
        dueDate,
        description: description || "Cobrança"
      })
    });

    if (!chargeResponse.ok) {
      const error = await chargeResponse.json();
      throw new Error(error.errors?.[0]?.description || "Erro ao criar cobrança");
    }

    const charge = await chargeResponse.json();

    // Criar BillingLink
    const billingLink = await base44.asServiceRole.entities.BillingLink.create({
      customerId,
      orderId,
      asaasChargeId: charge.id,
      amount,
      status: charge.status,
      dueDate,
      billingUrl: charge.invoiceUrl,
      description
    });

    // Se tiver orderId, atualizar o pedido
    if (orderId) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        billingStatus: "PENDING",
        billingLinkId: billingLink.id
      });
    }

    return {
      statusCode: 200,
      body: {
        success: true,
        billingLink,
        invoiceUrl: charge.invoiceUrl
      }
    };

  } catch (error) {
    console.error("Erro ao criar cobrança:", error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
}