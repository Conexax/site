import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { template_id, contract_data } = await req.json();

    if (!template_id || !contract_data) {
      return Response.json({ 
        error: 'Dados obrigatórios: template_id, contract_data' 
      }, { status: 400 });
    }

    // Buscar template
    const template = await base44.asServiceRole.entities.ContractTemplate.get(template_id);
    if (!template) {
      return Response.json({ error: 'Template não encontrado' }, { status: 404 });
    }

    // Buscar cliente
    const client = contract_data.client_id 
      ? await base44.asServiceRole.entities.Client.get(contract_data.client_id)
      : null;

    // Preparar dados para substituição
    const replacements = {};
    const currentDate = new Date();

    if (template.placeholders && template.placeholders.length > 0) {
      for (const placeholder of template.placeholders) {
        let value = placeholder.default_value || "";

        // Mapear campo se configurado
        if (placeholder.mapped_field) {
          const [entity, field] = placeholder.mapped_field.split('.');

          if (entity === 'client' && client) {
            value = client[field] || value;
          } else if (entity === 'contract' && contract_data) {
            value = contract_data[field] || value;
          } else if (entity === 'current_date') {
            value = currentDate.toLocaleDateString('pt-BR');
          } else if (entity === 'current_year') {
            value = currentDate.getFullYear().toString();
          }
        }

        // Formatações especiais
        if (placeholder.key.includes('valor') || placeholder.key.includes('value')) {
          if (typeof value === 'number') {
            value = `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          }
        }

        if (placeholder.key.includes('date') || placeholder.key.includes('data')) {
          if (value && typeof value === 'string' && value.includes('-')) {
            const date = new Date(value);
            value = date.toLocaleDateString('pt-BR');
          }
        }

        replacements[placeholder.key] = value;
      }
    }

    // Criar contrato no sistema
    const newContract = await base44.asServiceRole.entities.Contract.create({
      ...contract_data,
      custom_fields: {
        ...contract_data.custom_fields,
        generated_from_template: template_id,
        template_name: template.name,
        placeholder_values: replacements
      }
    });

    // Incrementar contador de uso do template
    await base44.asServiceRole.entities.ContractTemplate.update(template_id, {
      usage_count: (template.usage_count || 0) + 1
    });

    // Registrar auditoria
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Contract',
      entity_id: newContract.id,
      action: 'GENERATE_FROM_TEMPLATE',
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      description: `Contrato gerado a partir do modelo: ${template.name}`,
      metadata: {
        template_id: template_id,
        template_name: template.name,
        replacements: replacements
      }
    });

    return Response.json({
      success: true,
      contract: newContract,
      replacements: replacements,
      message: 'Contrato gerado com sucesso a partir do modelo'
    });

  } catch (error) {
    console.error('Erro ao gerar contrato:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});