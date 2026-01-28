import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Settings, Percent } from "lucide-react";
import { toast } from "sonner";

export default function OTEConfiguration() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    seller_id: "",
    is_default: false,
    monthly_target: "",
    fixed_commission: "",
    variable_commission_rate: "",
    accelerators: [],
    early_churn_period_days: "90",
    early_churn_penalty_percentage: "100",
    valid_from: new Date().toISOString().split('T')[0],
    status: "active",
    notes: ""
  });

  const queryClient = useQueryClient();

  const { data: models = [] } = useQuery({
    queryKey: ["oteModels"],
    queryFn: () => base44.entities.OTEModel.list("-created_date", 100),
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["commercialTeam"],
    queryFn: () => base44.entities.CommercialTeamMember.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OTEModel.create({
      ...data,
      monthly_target: parseFloat(data.monthly_target),
      fixed_commission: parseFloat(data.fixed_commission),
      variable_commission_rate: parseFloat(data.variable_commission_rate),
      early_churn_period_days: parseInt(data.early_churn_period_days),
      early_churn_penalty_percentage: parseFloat(data.early_churn_penalty_percentage)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oteModels"] });
      toast.success("Modelo OTE criado!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OTEModel.update(id, {
      ...data,
      monthly_target: parseFloat(data.monthly_target),
      fixed_commission: parseFloat(data.fixed_commission),
      variable_commission_rate: parseFloat(data.variable_commission_rate),
      early_churn_period_days: parseInt(data.early_churn_period_days),
      early_churn_penalty_percentage: parseFloat(data.early_churn_penalty_percentage)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oteModels"] });
      toast.success("Modelo OTE atualizado!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OTEModel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oteModels"] });
      toast.success("Modelo OTE excluído!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const handleOpenDialog = (model = null) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        name: model.name || "",
        seller_id: model.seller_id || "",
        is_default: model.is_default || false,
        monthly_target: model.monthly_target?.toString() || "",
        fixed_commission: model.fixed_commission?.toString() || "",
        variable_commission_rate: model.variable_commission_rate?.toString() || "",
        accelerators: model.accelerators || [],
        early_churn_period_days: model.early_churn_period_days?.toString() || "90",
        early_churn_penalty_percentage: model.early_churn_penalty_percentage?.toString() || "100",
        valid_from: model.valid_from || new Date().toISOString().split('T')[0],
        status: model.status || "active",
        notes: model.notes || ""
      });
    } else {
      setEditingModel(null);
      setFormData({
        name: "",
        seller_id: "",
        is_default: false,
        monthly_target: "",
        fixed_commission: "",
        variable_commission_rate: "",
        accelerators: [],
        early_churn_period_days: "90",
        early_churn_penalty_percentage: "100",
        valid_from: new Date().toISOString().split('T')[0],
        status: "active",
        notes: ""
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingModel(null);
  };

  const handleSubmit = () => {
    if (editingModel) {
      updateMutation.mutate({ id: editingModel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addAccelerator = () => {
    setFormData({
      ...formData,
      accelerators: [...formData.accelerators, { threshold_percentage: 100, multiplier: 1 }]
    });
  };

  const updateAccelerator = (index, field, value) => {
    const updated = [...formData.accelerators];
    updated[index][field] = parseFloat(value) || 0;
    setFormData({ ...formData, accelerators: updated });
  };

  const removeAccelerator = (index) => {
    setFormData({
      ...formData,
      accelerators: formData.accelerators.filter((_, i) => i !== index)
    });
  };

  const getSellerName = (sellerId) => {
    if (!sellerId) return "Padrão (todos)";
    const seller = sellers.find(s => s.id === sellerId);
    return seller?.name || "-";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-900">Modelos de OTE</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-[#355340] hover:bg-[#355340]/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      <div className="grid gap-4">
        {models.map((model) => (
          <Card key={model.id} className="border-slate-200">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{model.name}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    {getSellerName(model.seller_id)}
                    {model.is_default && <span className="ml-2 text-xs bg-[#355340] text-white px-2 py-0.5 rounded">Padrão</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(model)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(model.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Meta Mensal</p>
                  <p className="font-semibold text-slate-900">R$ {model.monthly_target?.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Comissão Fixa</p>
                  <p className="font-semibold text-slate-900">R$ {model.fixed_commission?.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Comissão Variável</p>
                  <p className="font-semibold text-slate-900">{model.variable_commission_rate}%</p>
                </div>
                <div>
                  <p className="text-slate-500">Aceleradores</p>
                  <p className="font-semibold text-slate-900">{model.accelerators?.length || 0} faixas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModel ? "Editar Modelo OTE" : "Novo Modelo OTE"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome do Modelo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: OTE Vendedor Pleno 2026"
                />
              </div>
              <div>
                <Label>Vendedor Específico</Label>
                <Select value={formData.seller_id} onValueChange={(v) => setFormData({ ...formData, seller_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Padrão (todos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Padrão (todos)</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Meta Mensal (R$) *</Label>
                <Input
                  type="number"
                  value={formData.monthly_target}
                  onChange={(e) => setFormData({ ...formData, monthly_target: e.target.value })}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label>Comissão Fixa (R$) *</Label>
                <Input
                  type="number"
                  value={formData.fixed_commission}
                  onChange={(e) => setFormData({ ...formData, fixed_commission: e.target.value })}
                  placeholder="2000"
                />
              </div>
              <div>
                <Label>Comissão Variável (%) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.variable_commission_rate}
                  onChange={(e) => setFormData({ ...formData, variable_commission_rate: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Aceleradores de Performance</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAccelerator}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {formData.accelerators.map((acc, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={acc.threshold_percentage}
                      onChange={(e) => updateAccelerator(idx, 'threshold_percentage', e.target.value)}
                      placeholder="% meta"
                      className="w-24"
                    />
                    <span className="text-sm text-slate-500">da meta →</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={acc.multiplier}
                      onChange={(e) => updateAccelerator(idx, 'multiplier', e.target.value)}
                      placeholder="Multiplicador"
                      className="w-28"
                    />
                    <span className="text-sm text-slate-500">x comissão</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAccelerator(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Período Churn Precoce (dias)</Label>
                <Input
                  type="number"
                  value={formData.early_churn_period_days}
                  onChange={(e) => setFormData({ ...formData, early_churn_period_days: e.target.value })}
                  placeholder="90"
                />
              </div>
              <div>
                <Label>Penalidade Churn (%)</Label>
                <Input
                  type="number"
                  value={formData.early_churn_penalty_percentage}
                  onChange={(e) => setFormData({ ...formData, early_churn_penalty_percentage: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalhes adicionais sobre o modelo..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleSubmit}
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={!formData.name || !formData.monthly_target || !formData.fixed_commission || !formData.variable_commission_rate}
            >
              {editingModel ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}