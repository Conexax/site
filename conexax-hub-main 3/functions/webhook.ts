export default async function webhook(request, context) {
  const { token } = context.params;
  const { base44 } = context;

  try {
    // Buscar webhook config
    const webhookConfigs = await base44.asServiceRole.entities.WebhookConfig.filter({ token });
    
    if (!webhookConfigs || webhookConfigs.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Webhook não encontrado" })
      };
    }

    const webhookConfig = webhookConfigs[0];

    if (!webhookConfig.is_active) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Webhook desativado" })
      };
    }

    // Buscar primeira etapa do pipeline
    const stages = await base44.asServiceRole.entities.Stage.filter({ 
      pipeline_id: webhookConfig.pipeline_id 
    });
    
    const sortedStages = stages.sort((a, b) => a.order - b.order);
    const firstStage = sortedStages[0];

    if (!firstStage) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Pipeline sem etapas configuradas" })
      };
    }

    // Processar dados do formulário
    let formData = {};
    
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        formData = await request.json();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await request.text();
        const params = new URLSearchParams(body);
        formData = Object.fromEntries(params);
      }
    }

    // Extrair dados do payload_json se existir
    const payloadData = formData.payload_json || {};

    // Criar lead com os novos campos
    const leadData = {
      pipeline_id: webhookConfig.pipeline_id,
      stage_id: firstStage.id,
      link_id: webhookConfig.id,
      client_name: formData.client_name || formData.name || formData.nome || "",
      email: payloadData.email || formData.email || "",
      company_name: formData.company_name || formData.empresa || payloadData.empresa || "",
      phone: formData.phone || formData.telefone || payloadData.telefone || "",
      investimento: payloadData.investimento || formData.investimento || "",
      faturamento: payloadData.faturamento || formData.faturamento || "",
      city: formData.city || formData.cidade || "",
      plan: formData.plan || formData.plano || "",
      project: formData.project || formData.projeto || "",
      value_paid: formData.value_paid || formData.valor || "",
      utm_source: formData.utm_source || formData.source || webhookConfig.name,
      payload_json: formData
    };

    await base44.asServiceRole.entities.Lead.create(leadData);

    // Atualizar contador
    await base44.asServiceRole.entities.WebhookConfig.update(webhookConfig.id, {
      submissions_count: (webhookConfig.submissions_count || 0) + 1
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ 
        success: true, 
        message: "Lead criado com sucesso" 
      })
    };

  } catch (error) {
    console.error("Webhook error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Erro ao processar webhook",
        details: error.message 
      })
    };
  }
}