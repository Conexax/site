import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";

const GOAL_TYPES = [
  { value: 'qualified_leads', label: 'Leads Qualificados', unit: 'leads' },
  { value: 'closed_contracts', label: 'Contratos Fechados', unit: 'contratos' },
  { value: 'contract_value', label: 'Valor em Contratos', unit: 'R$' },
  { value: 'activities_completed', label: 'Atividades Completadas', unit: 'atividades' },
  { value: 'client_retention', label: 'Taxa de Retenção', unit: '%' }
];

const PERIOD_TYPES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' }
];

export default function GoalForm({ initialData, users, squads = [], onSubmit, isLoading }) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    description: '',
    goal_type: '',
    target_type: 'user',
    user_id: '',
    squad_id: '',
    target_value: '',
    period_type: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    risk_threshold: 70
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!formData.goal_type) newErrors.goal_type = "Tipo de meta é obrigatório";
    if (formData.target_type === 'user' && !formData.user_id) newErrors.user_id = "Usuário é obrigatório";
    if (formData.target_type === 'squad' && !formData.squad_id) newErrors.squad_id = "Squad é obrigatório";
    if (!formData.target_value || formData.target_value <= 0) newErrors.target_value = "Valor alvo deve ser maior que 0";
    if (!formData.start_date) newErrors.start_date = "Data de início é obrigatória";
    if (!formData.end_date) newErrors.end_date = "Data de término é obrigatória";
    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = "Data de término deve ser após a data de início";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const selectedGoalType = GOAL_TYPES.find(t => t.value === formData.goal_type);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Meta' : 'Nova Meta'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="name">Nome da Meta *</Label>
          <Input
            id="name"
            placeholder="Ex: Leads Qualificados Q1 2026"
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
            placeholder="Detalhes sobre a meta..."
            value={formData.description || ''}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="goal_type">Tipo de Meta *</Label>
            <Select value={formData.goal_type} onValueChange={(value) => setFormData({...formData, goal_type: value})}>
              <SelectTrigger id="goal_type" className={errors.goal_type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.goal_type && <p className="text-xs text-red-600 mt-1">{errors.goal_type}</p>}
          </div>

          <div>
            <Label htmlFor="target_type">Atribuir para *</Label>
            <Select value={formData.target_type} onValueChange={(value) => setFormData({...formData, target_type: value, user_id: '', squad_id: ''})}>
              <SelectTrigger id="target_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário Individual</SelectItem>
                <SelectItem value="squad">Squad</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.target_type === 'user' ? (
          <div>
            <Label htmlFor="user_id">Usuário *</Label>
            <Select value={formData.user_id} onValueChange={(value) => setFormData({...formData, user_id: value})}>
              <SelectTrigger id="user_id" className={errors.user_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.user_id && <p className="text-xs text-red-600 mt-1">{errors.user_id}</p>}
          </div>
        ) : (
          <div>
            <Label htmlFor="squad_id">Squad *</Label>
            <Select value={formData.squad_id} onValueChange={(value) => setFormData({...formData, squad_id: value})}>
              <SelectTrigger id="squad_id" className={errors.squad_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione um squad" />
              </SelectTrigger>
              <SelectContent>
                {squads.map(squad => (
                  <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.squad_id && <p className="text-xs text-red-600 mt-1">{errors.squad_id}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="target_value">
              Valor Alvo {selectedGoalType && `(${selectedGoalType.unit})`} *
            </Label>
            <Input
              id="target_value"
              type="number"
              placeholder="Ex: 50"
              value={formData.target_value}
              onChange={(e) => setFormData({...formData, target_value: parseFloat(e.target.value)})}
              className={errors.target_value ? 'border-red-500' : ''}
            />
            {errors.target_value && <p className="text-xs text-red-600 mt-1">{errors.target_value}</p>}
          </div>

          <div>
            <Label htmlFor="period_type">Período</Label>
            <Select value={formData.period_type} onValueChange={(value) => setFormData({...formData, period_type: value})}>
              <SelectTrigger id="period_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_TYPES.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date">Data de Início *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              className={errors.start_date ? 'border-red-500' : ''}
            />
            {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date}</p>}
          </div>

          <div>
            <Label htmlFor="end_date">Data de Término *</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              className={errors.end_date ? 'border-red-500' : ''}
            />
            {errors.end_date && <p className="text-xs text-red-600 mt-1">{errors.end_date}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="risk_threshold">Limite de Risco (%)</Label>
          <Input
            id="risk_threshold"
            type="number"
            min="0"
            max="100"
            value={formData.risk_threshold}
            onChange={(e) => setFormData({...formData, risk_threshold: parseInt(e.target.value)})}
          />
          <p className="text-xs text-slate-500 mt-1">Meta entra em risco quando abaixo desse percentual</p>
        </div>

        <div className="flex gap-2 justify-end border-t pt-6">
          <Button variant="outline" onClick={() => window.history.back()}>
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
                {initialData ? 'Atualizar' : 'Criar'} Meta
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}