import React, { useState, useEffect } from "react";
import { Zap, Plus, Clock, Database, Play, Pause, Trash2, MoreVertical, Calendar, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";

export default function AutomationsSettings() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    automation_type: "scheduled",
    schedule_type: "simple",
    repeat_interval: 1,
    repeat_unit: "days",
    start_time: "09:00",
    entity_name: "",
    event_types: ["create"],
    function_name: "",
  });

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/automations/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation_type: 'all' })
      });
      const data = await response.json();
      setAutomations(data.automations || []);
    } catch (error) {
      console.error("Erro ao carregar automações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAutomation = async () => {
    try {
      const payload = {
        automation_type: formData.automation_type,
        name: formData.name,
        function_name: formData.function_name,
        description: formData.description,
      };

      if (formData.automation_type === "scheduled") {
        payload.schedule_type = formData.schedule_type;
        payload.repeat_interval = parseInt(formData.repeat_interval);
        payload.repeat_unit = formData.repeat_unit;
        payload.start_time = formData.start_time;
      } else if (formData.automation_type === "entity") {
        payload.entity_name = formData.entity_name;
        payload.event_types = formData.event_types;
      }

      await fetch('/api/automations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      toast.success("Automação criada com sucesso");
      loadAutomations();
      handleCloseDialog();
    } catch (error) {
      toast.error("Erro ao criar automação");
    }
  };

  const handleToggleAutomation = async (automation) => {
    try {
      await fetch('/api/automations/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automation_id: automation.id,
          action: 'toggle',
          automation_name: automation.name
        })
      });
      toast.success(automation.is_active ? "Automação pausada" : "Automação ativada");
      loadAutomations();
    } catch (error) {
      toast.error("Erro ao alterar automação");
    }
  };

  const handleDeleteAutomation = async (automation) => {
    if (!confirm("Tem certeza que deseja excluir esta automação?")) return;
    
    try {
      await fetch('/api/automations/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automation_id: automation.id,
          action: 'delete',
          automation_name: automation.name
        })
      });
      toast.success("Automação excluída");
      loadAutomations();
    } catch (error) {
      toast.error("Erro ao excluir automação");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAutomation(null);
    setFormData({
      name: "",
      description: "",
      automation_type: "scheduled",
      schedule_type: "simple",
      repeat_interval: 1,
      repeat_unit: "days",
      start_time: "09:00",
      entity_name: "",
      event_types: ["create"],
      function_name: "",
    });
  };

  const availableEntities = ["Client", "Activity", "Contract", "Metric", "Lead", "Order"];
  const availableFunctions = ["sendEmailNotification", "syncData", "generateReport", "updateMetrics"];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automações</h1>
          <p className="text-slate-500 mt-1">Configure fluxos de trabalho automatizados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#355340] hover:bg-[#355340]/90">
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      {loading ? (
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">Carregando automações...</p>
          </CardContent>
        </Card>
      ) : automations.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <Zap className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma automação configurada</h3>
            <p className="text-slate-500 mb-6">
              Crie sua primeira automação para executar ações automaticamente
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-[#355340] hover:bg-[#355340]/90">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Automação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {automations.map((automation) => (
            <Card key={automation.id} className="border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${automation.is_active ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {automation.type === "scheduled" ? (
                        <Clock className={`h-5 w-5 ${automation.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                      ) : (
                        <Database className={`h-5 w-5 ${automation.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{automation.name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{automation.description || "Sem descrição"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {automation.type === "scheduled" ? "Agendada" : "Evento"}
                        </Badge>
                        <Badge variant={automation.is_active ? "default" : "secondary"} className="text-xs">
                          {automation.is_active ? "Ativa" : "Pausada"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleAutomation(automation)}>
                        {automation.is_active ? (
                          <><Pause className="h-4 w-4 mr-2" />Pausar</>
                        ) : (
                          <><Play className="h-4 w-4 mr-2" />Ativar</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteAutomation(automation)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAutomation ? "Editar Automação" : "Nova Automação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Automação *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Notificar novo lead"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o que esta automação faz..."
                rows={2}
              />
            </div>

            <div>
              <Label>Tipo de Automação *</Label>
              <Select value={formData.automation_type} onValueChange={(v) => setFormData({ ...formData, automation_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendada (executar periodicamente)</SelectItem>
                  <SelectItem value="entity">Evento (quando algo acontecer)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.automation_type === "scheduled" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Intervalo *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.repeat_interval}
                      onChange={(e) => setFormData({ ...formData, repeat_interval: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Unidade *</Label>
                    <Select value={formData.repeat_unit} onValueChange={(v) => setFormData({ ...formData, repeat_unit: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutos</SelectItem>
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                        <SelectItem value="weeks">Semanas</SelectItem>
                        <SelectItem value="months">Meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Horário de Início</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.automation_type === "entity" && (
              <>
                <div>
                  <Label>Entidade *</Label>
                  <Select value={formData.entity_name} onValueChange={(v) => setFormData({ ...formData, entity_name: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a entidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEntities.map((entity) => (
                        <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Eventos *</Label>
                  <div className="flex gap-2 mt-2">
                    {["create", "update", "delete"].map((event) => (
                      <Button
                        key={event}
                        type="button"
                        variant={formData.event_types.includes(event) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const events = formData.event_types.includes(event)
                            ? formData.event_types.filter(e => e !== event)
                            : [...formData.event_types, event];
                          setFormData({ ...formData, event_types: events });
                        }}
                        className={formData.event_types.includes(event) ? "bg-[#355340] hover:bg-[#355340]/90" : ""}
                      >
                        {event === "create" ? "Criar" : event === "update" ? "Atualizar" : "Excluir"}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <Label>Função Backend *</Label>
              <Input
                value={formData.function_name}
                onChange={(e) => setFormData({ ...formData, function_name: e.target.value })}
                placeholder="Ex: sendEmailNotification"
              />
              <p className="text-xs text-slate-500 mt-1">Nome da função que será executada</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleCreateAutomation} 
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={!formData.name || !formData.function_name || 
                (formData.automation_type === "entity" && (!formData.entity_name || formData.event_types.length === 0))}
            >
              {editingAutomation ? "Salvar" : "Criar Automação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}