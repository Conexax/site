import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/ui/StatusBadge";
import DatePicker from "@/components/ui/DatePicker";
import DeleteConfirmDialog from "@/components/dialogs/DeleteConfirmDialog";
import StatsCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import CommentSection from "@/components/collaboration/CommentSection";
import FileAttachments from "@/components/collaboration/FileAttachments";
import { AuditPageView } from "@/components/audit/AuditLogger";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import { toast } from "sonner";

export default function Activities() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [viewingActivity, setViewingActivity] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client_id: "",
    responsible_id: "",
    type: "operational",
    status: "pending",
    priority: "medium",
    due_date: ""
  });

  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.Activity.list("-created_date", 500),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Activity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Atividade criada com sucesso!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao criar atividade: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Activity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Atividade atualizada com sucesso!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar atividade: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Activity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Atividade excluída com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir atividade: ${error.message}`);
    }
  });

  const handleOpenDialog = (activity = null) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        title: activity.title || "",
        description: activity.description || "",
        client_id: activity.client_id || "",
        responsible_id: activity.responsible_id || "",
        type: activity.type || "operational",
        status: activity.status || "pending",
        priority: activity.priority || "medium",
        due_date: activity.due_date || ""
      });
    } else {
      setEditingActivity(null);
      setFormData({
        title: "",
        description: "",
        client_id: "",
        responsible_id: "",
        type: "operational",
        status: "pending",
        priority: "medium",
        due_date: ""
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingActivity(null);
  };

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error("Título é obrigatório");
      return;
    }
    if (editingActivity) {
      updateMutation.mutate({ id: editingActivity.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteClick = (activity) => {
    setItemToDelete(activity);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || activity.status === statusFilter;
    const matchesType = typeFilter === "all" || activity.type === typeFilter;
    const matchesPriority = priorityFilter === "all" || activity.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  const pendingCount = activities.filter(a => a.status === "pending").length;
  const inProgressCount = activities.filter(a => a.status === "in_progress").length;
  const completedCount = activities.filter(a => a.status === "completed").length;
  const overdueCount = activities.filter(a => a.status === "overdue").length;

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || "-";
  };

  const getResponsibleName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || "-";
  };

  const typeLabels = {
    commercial: "Comercial",
    operational: "Operacional",
    financial: "Financeiro"
  };

  return (
    <>
      <AuditPageView pageName="Activities" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Atividades</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie todas as atividades da equipe</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#355340] hover:bg-[#355340]/90">
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Pendentes" value={pendingCount} icon={Clock} />
        <StatsCard title="Em Andamento" value={inProgressCount} icon={Clock} iconClassName="bg-blue-500" />
        <StatsCard title="Concluídas" value={completedCount} icon={CheckCircle2} iconClassName="bg-emerald-500" />
        <StatsCard title="Atrasadas" value={overdueCount} icon={AlertCircle} iconClassName="bg-red-500" />
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar atividades..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="overdue">Atrasada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="commercial">Comercial</SelectItem>
                <SelectItem value="operational">Operacional</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nenhuma atividade encontrada"
              description="Crie uma nova atividade para começar"
              actionLabel="Nova Atividade"
              onAction={() => handleOpenDialog()}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      activity.status === "overdue" ? "bg-red-100" :
                      activity.status === "completed" ? "bg-emerald-100" :
                      activity.status === "in_progress" ? "bg-blue-100" : "bg-slate-100"
                    }`}>
                      {activity.status === "overdue" ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : activity.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="cursor-pointer" 
                          onClick={() => {
                            setViewingActivity(activity);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <h3 className="font-medium text-slate-800">{activity.title}</h3>
                          {activity.description && (
                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{activity.description}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(activity)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteClick(activity)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <StatusBadge status={activity.status} />
                        <StatusBadge status={activity.priority} />
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {typeLabels[activity.type] || activity.type}
                        </span>
                        {activity.client_id && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {getClientName(activity.client_id)}
                          </span>
                        )}
                        {activity.due_date && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(activity.due_date), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? "Editar Atividade" : "Nova Atividade"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título da atividade"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição detalhada"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Select 
                  value={formData.responsible_id} 
                  onValueChange={(v) => setFormData({ ...formData, responsible_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">Comercial</SelectItem>
                    <SelectItem value="operational">Operacional</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="overdue">Atrasada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Data de Prazo</Label>
              <DatePicker
                value={formData.due_date}
                onChange={(date) => setFormData({ ...formData, due_date: date })}
                placeholder="Selecione uma data ou digite DD/MM/AAAA"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={!formData.title}
            >
              {editingActivity ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir atividade"
        itemName={itemToDelete?.title || ""}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingActivity?.title}</DialogTitle>
          </DialogHeader>
          {viewingActivity && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Descrição</p>
                <p className="text-slate-700 mt-1">{viewingActivity.description || "Sem descrição"}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-slate-500">Status</p>
                  <StatusBadge status={viewingActivity.status} className="mt-1" />
                </div>
                <div>
                  <p className="font-medium text-slate-500">Prioridade</p>
                  <StatusBadge status={viewingActivity.priority} className="mt-1" />
                </div>
                <div>
                  <p className="font-medium text-slate-500">Tipo</p>
                  <p className="mt-1">{typeLabels[viewingActivity.type]}</p>
                </div>
                {viewingActivity.due_date && (
                  <div>
                    <p className="font-medium text-slate-500">Prazo</p>
                    <p className="mt-1">{format(new Date(viewingActivity.due_date), "dd/MM/yyyy")}</p>
                  </div>
                )}
              </div>

              <FileAttachments entityType="activity" entityId={viewingActivity.id} />
              <CommentSection entityType="activity" entityId={viewingActivity.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}