import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Power,
  Play, 
  AlertCircle,
  CheckCircle2,
  Eye,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditPageView } from "@/components/audit/AuditLogger";
import WorkflowRuleForm from "@/components/automation/WorkflowRuleForm";

export default function WorkflowAutomation() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [viewingRule, setViewingRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['workflow-rules'],
    queryFn: () => base44.entities.WorkflowRule.list('-created_date'),
  });

  const { data: executions = [] } = useQuery({
    queryKey: ['workflow-executions'],
    queryFn: async () => {
      try {
        return await base44.entities.WorkflowExecution.list('-execution_timestamp', 50);
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkflowRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      setCreateDialogOpen(false);
      toast.success("Regra criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar regra: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkflowRule.update(editingRule.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      setEditingRule(null);
      toast.success("Regra atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar regra: " + error.message);
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (rule) => base44.entities.WorkflowRule.update(rule.id, { is_active: !rule.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      toast.success("Status da regra atualizado");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      toast.success("Regra deletada!");
    }
  });

  const getTriggerLabel = (trigger) => {
    const labels = {
      'lead_created': '📩 Lead Criado',
      'lead_qualified': '✅ Lead Qualificado',
      'lead_stage_change': '📊 Lead Muda Estágio',
      'activity_created': '📝 Atividade Criada',
      'client_no_activity': '⏳ Cliente sem Atividade',
      'client_status_change': '🔄 Status do Cliente Muda'
    };
    return labels[trigger] || trigger;
  };

  const getActionLabel = (action) => {
    const labels = {
      'send_email': '📧 Enviar Email',
      'create_activity': '✏️ Criar Atividade',
      'update_status': '🔄 Atualizar Status',
      'send_notification': '🔔 Notificação'
    };
    return labels[action] || action;
  };

  return (
    <>
      <AuditPageView pageName="WorkflowAutomation" />
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Automação de Fluxos</h1>
            <p className="text-slate-500 text-sm mt-1">
              Configure regras para automatizar ações no CRM
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-[#355340] hover:bg-[#355340]/90 gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Regra
          </Button>
        </div>

        {/* Rules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Regras de Automação</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6 text-slate-500">Carregando...</div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Nenhuma regra configurada</p>
                <p className="text-slate-500 text-sm mt-1">Crie sua primeira regra para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Gatilho</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead className="text-right">Execuções</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-xs text-slate-500 mt-1">{rule.description.substring(0, 50)}...</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTriggerLabel(rule.trigger_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">{getActionLabel(rule.action_type)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">{rule.execution_count || 0}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={rule.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}>
                            {rule.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewingRule(rule)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingRule(rule)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleMutation.mutate(rule)}
                              title={rule.is_active ? 'Desativar' : 'Ativar'}
                            >
                              <Power className={`h-4 w-4 ${rule.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (window.confirm('Deseja deletar esta regra?')) {
                                  deleteMutation.mutate(rule.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution History */}
        {executions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Execuções (Últimas 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {executions.slice(0, 10).map((exec) => (
                  <div key={exec.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg text-sm">
                    {exec.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{exec.rule_name}</p>
                      <p className="text-xs text-slate-600">
                        {exec.entity_type} #{exec.entity_id} • {format(new Date(exec.execution_timestamp), 'dd/MM HH:mm:ss', { locale: ptBR })}
                      </p>
                    </div>
                    <Badge className={exec.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                      {exec.status === 'success' ? 'Sucesso' : 'Erro'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || !!editingRule} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditingRule(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Automação'}</DialogTitle>
          </DialogHeader>
          <WorkflowRuleForm
            initialData={editingRule}
            onSubmit={(data) => {
              if (editingRule) {
                updateMutation.mutate(data);
              } else {
                createMutation.mutate(data);
              }
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingRule} onOpenChange={(open) => {
        if (!open) setViewingRule(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingRule?.name}</DialogTitle>
          </DialogHeader>
          {viewingRule && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Descrição</p>
                <p className="text-slate-900 mt-1">{viewingRule.description || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Gatilho</p>
                  <p className="text-slate-900 mt-1">{getTriggerLabel(viewingRule.trigger_type)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Ação</p>
                  <p className="text-slate-900 mt-1">{getActionLabel(viewingRule.action_type)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <Badge className={viewingRule.is_active ? 'bg-emerald-100 text-emerald-800 mt-1' : 'bg-slate-100 text-slate-800 mt-1'}>
                    {viewingRule.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Execuções</p>
                  <p className="text-slate-900 mt-1">{viewingRule.execution_count || 0}</p>
                </div>
              </div>
              {viewingRule.last_execution_date && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Última Execução</p>
                  <p className="text-slate-900 mt-1">
                    {format(new Date(viewingRule.last_execution_date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}