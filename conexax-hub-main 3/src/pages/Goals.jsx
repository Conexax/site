import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Eye, Zap, TrendingUp } from "lucide-react";
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
import GoalForm from "@/components/goals/GoalForm";
import GoalProgressCard from "@/components/goals/GoalProgressCard";

export default function Goals() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [viewingGoal, setViewingGoal] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      let targetName = '';
      if (data.target_type === 'user') {
        const user = users.find(u => u.id === data.user_id);
        targetName = user?.full_name || data.user_id;
      } else {
        const squad = squads.find(s => s.id === data.squad_id);
        targetName = squad?.name || data.squad_id;
      }
      return base44.entities.Goal.create({
        ...data,
        user_name: targetName,
        status: 'not_started'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setCreateDialogOpen(false);
      toast.success("Meta criada com sucesso!");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Goal.update(editingGoal.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setEditingGoal(null);
      toast.success("Meta atualizada!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success("Meta deletada!");
    }
  });

  const getGoalTypeLabel = (type) => {
    const labels = {
      'qualified_leads': 'Leads Qualificados',
      'closed_contracts': 'Contratos Fechados',
      'contract_value': 'Valor em Contratos',
      'activities_completed': 'Atividades Completadas',
      'client_retention': 'Taxa de Retenção'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'achieved': return 'bg-emerald-100 text-emerald-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const activeGoals = goals.filter(g => {
    const now = new Date();
    return new Date(g.start_date) <= now && now <= new Date(g.end_date);
  });

  const stats = {
    achieved: goals.filter(g => g.status === 'achieved').length,
    atRisk: goals.filter(g => g.status === 'at_risk').length,
    inProgress: goals.filter(g => g.status === 'in_progress').length
  };

  return (
    <>
      <AuditPageView pageName="Goals" />
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Metas e KPIs</h1>
            <p className="text-slate-500 text-sm mt-1">
              Defina e acompanhe metas para SDRs e Closers
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-[#355340] hover:bg-[#355340]/90 gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Meta
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500 font-medium">Total de Metas</div>
              <div className="text-3xl font-bold text-slate-900 mt-2">{goals.length}</div>
              <div className="text-xs text-slate-500 mt-2">{activeGoals.length} ativas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500 font-medium">✅ Atingidas</div>
              <div className="text-3xl font-bold text-emerald-600 mt-2">{stats.achieved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500 font-medium">📊 Em Progresso</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500 font-medium">⚠️ Em Risco</div>
              <div className="text-3xl font-bold text-red-600 mt-2">{stats.atRisk}</div>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            onClick={() => setViewMode('cards')}
            size="sm"
          >
            Cartões
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
            size="sm"
          >
            Tabela
          </Button>
        </div>

        {/* Goals Display */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Carregando...</div>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Nenhuma meta configurada</p>
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => (
              <div key={goal.id} className="relative">
                <GoalProgressCard goal={goal} />
                <div className="absolute top-4 right-4 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white shadow"
                    onClick={() => setViewingGoal(goal)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white shadow"
                    onClick={() => setEditingGoal(goal)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white shadow text-red-600"
                    onClick={() => {
                      if (window.confirm('Deseja deletar esta meta?')) {
                        deleteMutation.mutate(goal.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meta</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="text-right">Progresso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals.map(goal => (
                      <TableRow key={goal.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{goal.name}</p>
                            <p className="text-xs text-slate-500">{getGoalTypeLabel(goal.goal_type)}</p>
                          </div>
                        </TableCell>
                        <TableCell>{goal.user_name}</TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-semibold">{goal.progress_percentage || 0}%</p>
                            <p className="text-xs text-slate-500">{goal.current_value}/{goal.target_value}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(goal.status)}>
                            {goal.status === 'achieved' ? '✅ Atingida' :
                             goal.status === 'at_risk' ? '⚠️ Em Risco' :
                             goal.status === 'in_progress' ? '📊 Progresso' :
                             '⏳ Não Iniciada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {format(new Date(goal.start_date), 'dd/MM', { locale: ptBR })} - {format(new Date(goal.end_date), 'dd/MM', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingGoal(goal)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || !!editingGoal} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditingGoal(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
          </DialogHeader>
          <GoalForm
            initialData={editingGoal}
            users={users}
            squads={squads}
            onSubmit={(data) => {
              if (editingGoal) {
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
      <Dialog open={!!viewingGoal} onOpenChange={(open) => {
        if (!open) setViewingGoal(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingGoal?.name}</DialogTitle>
          </DialogHeader>
          {viewingGoal && (
            <div className="space-y-4">
              <GoalProgressCard goal={viewingGoal} />
              {viewingGoal.description && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Descrição</p>
                  <p className="text-slate-900 mt-1">{viewingGoal.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}