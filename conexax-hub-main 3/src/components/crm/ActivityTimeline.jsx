import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Phone, Video, Clock, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const typeIcons = {
  task: Clock,
  call: Phone,
  meeting: Video,
  email: "📧",
  note: "📝"
};

const typeBadgeColors = {
  task: "bg-blue-100 text-blue-800",
  call: "bg-green-100 text-green-800",
  meeting: "bg-purple-100 text-purple-800",
  email: "bg-yellow-100 text-yellow-800",
  note: "bg-gray-100 text-gray-800"
};

const statusIcons = {
  pending: Circle,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  cancelled: Circle
};

export default function ActivityTimeline({ entityId, entityType }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "task",
    title: "",
    description: "",
    priority: "medium",
    scheduled_date: new Date().toISOString().split('T')[0]
  });

  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', entityId, entityType],
    queryFn: async () => {
      const query = entityType === 'lead' 
        ? { lead_id: entityId }
        : { client_id: entityId };
      return await base44.entities.Activity.filter(query, '-scheduled_date', 50);
    },
    enabled: !!entityId
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        [entityType === 'lead' ? 'lead_id' : 'client_id']: entityId
      };
      return await base44.entities.Activity.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityId, entityType] });
      setDialogOpen(false);
      setFormData({
        type: "task",
        title: "",
        description: "",
        priority: "medium",
        scheduled_date: new Date().toISOString().split('T')[0]
      });
      toast.success("Atividade criada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar atividade: " + error.message);
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Activity.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityId, entityType] });
      toast.success("Atividade atualizada");
    }
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    createActivityMutation.mutate(formData);
  };

  const handleStatusChange = (activityId, newStatus) => {
    updateActivityMutation.mutate({
      id: activityId,
      data: { 
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString() : null
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Atividades</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Atividade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tarefa</SelectItem>
                    <SelectItem value="call">Chamada</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="note">Nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input 
                  placeholder="Título da atividade"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea 
                  placeholder="Descrição detalhada"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prioridade</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
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
                <div>
                  <Label>Data Agendada</Label>
                  <Input 
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createActivityMutation.isPending}>
                {createActivityMutation.isPending ? "Criando..." : "Criar Atividade"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando atividades...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhuma atividade registrada</div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const TypeIcon = typeof typeIcons[activity.type] === 'string' ? null : typeIcons[activity.type];
              const StatusIcon = statusIcons[activity.status];
              
              return (
                <div key={activity.id} className="border-l-4 border-[#62997f] pl-4 py-2 hover:bg-slate-50 rounded transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {TypeIcon && <TypeIcon className="h-4 w-4 text-[#62997f]" />}
                        {typeof typeIcons[activity.type] === 'string' && <span>{typeIcons[activity.type]}</span>}
                        <h4 className="font-semibold text-sm">{activity.title}</h4>
                        <Badge className={typeBadgeColors[activity.type]}>
                          {activity.type}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{format(new Date(activity.scheduled_date), 'dd MMM yyyy HH:mm')}</span>
                        {activity.priority === 'high' && <Badge variant="destructive">Alta Prioridade</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={activity.status} onValueChange={(value) => handleStatusChange(activity.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="in_progress">Em Progresso</SelectItem>
                          <SelectItem value="completed">Concluída</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}