import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const TRIGGER_TYPES = [
  { value: 'lead_created', label: 'Lead Criado' },
  { value: 'lead_qualified', label: 'Lead Qualificado' },
  { value: 'lead_stage_change', label: 'Lead Muda de Estágio' },
  { value: 'activity_created', label: 'Atividade Criada' },
  { value: 'client_no_activity', label: 'Cliente sem Atividade (X dias)' },
  { value: 'client_status_change', label: 'Status do Cliente Muda' }
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Enviar Email' },
  { value: 'create_activity', label: 'Criar Atividade' },
  { value: 'update_status', label: 'Atualizar Status' },
  { value: 'send_notification', label: 'Enviar Notificação' }
];

const EMAIL_TEMPLATES = [
  { value: 'welcome', label: 'Email de Boas-vindas' },
  { value: 'followup', label: 'Email de Acompanhamento' },
  { value: 'reminder', label: 'Email de Lembrete' }
];

const ACTIVITY_TYPES = [
  { value: 'task', label: 'Tarefa' },
  { value: 'call', label: 'Ligação' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'email', label: 'Email' }
];

export default function WorkflowRuleForm({ initialData, onSubmit, isLoading }) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    description: '',
    trigger_type: '',
    trigger_conditions: {},
    action_type: '',
    action_config: {},
    is_active: true
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!formData.trigger_type) newErrors.trigger_type = "Tipo de gatilho é obrigatório";
    if (!formData.action_type) newErrors.action_type = "Tipo de ação é obrigatório";

    // Validações específicas por tipo de ação
    if (formData.action_type === 'send_email' && !formData.action_config?.template) {
      newErrors.email_template = "Template de email é obrigatório";
    }
    if (formData.action_type === 'create_activity' && !formData.action_config?.activity_type) {
      newErrors.activity_type = "Tipo de atividade é obrigatório";
    }
    if (formData.action_type === 'update_status' && !formData.action_config?.new_status) {
      newErrors.status = "Novo status é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Regra' : 'Nova Regra de Automação'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Regra *</Label>
            <Input
              id="name"
              placeholder="Ex: Email de boas-vindas para leads qualificados"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Detalhes sobre o que essa regra faz..."
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Ativar Regra</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
            />
          </div>
        </div>

        {/* Trigger Configuration */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-slate-900 mb-4">Gatilho (Quando?)</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="trigger">Tipo de Gatilho *</Label>
              <Select value={formData.trigger_type} onValueChange={(value) => setFormData({...formData, trigger_type: value})}>
                <SelectTrigger id="trigger" className={errors.trigger_type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione um gatilho" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.trigger_type && <p className="text-xs text-red-600 mt-1">{errors.trigger_type}</p>}
            </div>

            {/* Conditional fields based on trigger */}
            {formData.trigger_type === 'client_no_activity' && (
              <div>
                <Label htmlFor="days">Dias sem Atividade</Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  placeholder="Ex: 7"
                  value={formData.trigger_conditions?.days || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    trigger_conditions: {...formData.trigger_conditions, days: parseInt(e.target.value)}
                  })}
                />
              </div>
            )}

            {formData.trigger_type === 'lead_stage_change' && (
              <div>
                <Label htmlFor="stage">Para qual Estágio?</Label>
                <Select 
                  value={formData.trigger_conditions?.to_stage || ''} 
                  onValueChange={(value) => setFormData({
                    ...formData,
                    trigger_conditions: {...formData.trigger_conditions, to_stage: value}
                  })}
                >
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Selecione um estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="captado">Captado</SelectItem>
                    <SelectItem value="qualificado">Qualificado</SelectItem>
                    <SelectItem value="handoff">Handoff</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                    <SelectItem value="descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Action Configuration */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-slate-900 mb-4">Ação (O quê?)</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="action">Tipo de Ação *</Label>
              <Select value={formData.action_type} onValueChange={(value) => setFormData({...formData, action_type: value})}>
                <SelectTrigger id="action" className={errors.action_type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione uma ação" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.action_type && <p className="text-xs text-red-600 mt-1">{errors.action_type}</p>}
            </div>

            {/* Conditional action configs */}
            {formData.action_type === 'send_email' && (
              <div>
                <Label htmlFor="template">Template de Email *</Label>
                <Select 
                  value={formData.action_config?.template || ''} 
                  onValueChange={(value) => setFormData({
                    ...formData,
                    action_config: {...formData.action_config, template: value}
                  })}
                >
                  <SelectTrigger id="template" className={errors.email_template ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.email_template && <p className="text-xs text-red-600 mt-1">{errors.email_template}</p>}
              </div>
            )}

            {formData.action_type === 'create_activity' && (
              <>
                <div>
                  <Label htmlFor="activity_type">Tipo de Atividade *</Label>
                  <Select 
                    value={formData.action_config?.activity_type || ''} 
                    onValueChange={(value) => setFormData({
                      ...formData,
                      action_config: {...formData.action_config, activity_type: value}
                    })}
                  >
                    <SelectTrigger id="activity_type" className={errors.activity_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione um tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.activity_type && <p className="text-xs text-red-600 mt-1">{errors.activity_type}</p>}
                </div>

                <div>
                  <Label htmlFor="activity_title">Título da Atividade</Label>
                  <Input
                    id="activity_title"
                    placeholder="Ex: Acompanhamento com cliente"
                    value={formData.action_config?.title || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      action_config: {...formData.action_config, title: e.target.value}
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select 
                    value={formData.action_config?.priority || 'medium'} 
                    onValueChange={(value) => setFormData({
                      ...formData,
                      action_config: {...formData.action_config, priority: value}
                    })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.action_type === 'update_status' && (
              <div>
                <Label htmlFor="new_status">Novo Status *</Label>
                <Select 
                  value={formData.action_config?.new_status || ''} 
                  onValueChange={(value) => setFormData({
                    ...formData,
                    action_config: {...formData.action_config, new_status: value}
                  })}
                >
                  <SelectTrigger id="new_status" className={errors.status ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status}</p>}
              </div>
            )}

            {formData.action_type === 'send_notification' && (
              <div>
                <Label htmlFor="notification_message">Mensagem da Notificação</Label>
                <Textarea
                  id="notification_message"
                  placeholder="Mensagem a ser notificada..."
                  value={formData.action_config?.message || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    action_config: {...formData.action_config, message: e.target.value}
                  })}
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-2 justify-end border-t pt-6">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[#355340] hover:bg-[#355340]/90 gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {initialData ? 'Atualizar' : 'Criar'} Regra
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}