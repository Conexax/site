import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STATUS_TRANSITIONS = {
  draft: ['sent', 'cancelled'],
  sent: ['signed', 'cancelled'],
  signed: [],
  cancelled: []
};

const validateTransition = (currentStatus, newStatus) => {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { contract_id, new_status, reason } = await req.json();

    if (!contract_id || !new_status) {
      return Response.json({ 
        error: 'contract_id e new_status são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar contrato atual
    const contract = await base44.asServiceRole.entities.Contract.get(contract_id);
    
    if (!contract) {
      return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    const currentStatus = contract.status;

    // Validar transição
    if (!validateTransition(currentStatus, new_status)) {
      return Response.json({ 
        error: `Transição inválida de ${currentStatus} para ${new_status}` 
      }, { status: 400 });
    }

    // Preparar dados de atualização
    const updateData = {
      status: new_status
    };

    const now = new Date().toISOString();
    const statusHistoryEntry = {
      from_status: currentStatus,
      to_status: new_status,
      changed_by: user.id,
      changed_at: now,
      reason: reason || null
    };

    // Adicionar campos específicos por status
    if (new_status === 'sent') {
      updateData.sent_date = now;
      updateData.sent_by = user.id;
      updateData.sent_by_name = user.full_name;
    } else if (new_status === 'signed') {
      updateData.signed_date = now;
      updateData.signed_by = user.id;
      updateData.signed_by_name = user.full_name;
    } else if (new_status === 'cancelled') {
      updateData.cancelled_date = now;
      updateData.cancelled_by = user.id;
      updateData.cancelled_by_name = user.full_name;
      updateData.cancellation_reason = reason || 'Não informado';
    }

    // Adicionar entrada ao histórico
    const currentHistory = contract.status_history || [];
    updateData.status_history = [...currentHistory, statusHistoryEntry];

    // Atualizar contrato
    const updatedContract = await base44.asServiceRole.entities.Contract.update(
      contract_id, 
      updateData
    );

    // Registrar auditoria
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      timestamp: now,
      action: 'UPDATE_CONTRACT',
      entity_type: 'Contract',
      entity_id: contract_id,
      entity_name: contract.contract_number || contract_id.slice(0, 8),
      before_snapshot: {
        status: currentStatus,
        sent_date: contract.sent_date,
        signed_date: contract.signed_date,
        cancelled_date: contract.cancelled_date
      },
      after_snapshot: {
        status: new_status,
        sent_date: updateData.sent_date,
        signed_date: updateData.signed_date,
        cancelled_date: updateData.cancelled_date,
        reason: reason
      },
      result: 'success',
      metadata: {
        transition: `${currentStatus} -> ${new_status}`,
        reason: reason || null
      }
    });

    return Response.json({ 
      success: true, 
      contract: updatedContract 
    });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});