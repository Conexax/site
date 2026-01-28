import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  DollarSign,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlansSettings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    monthly_value: "",
    variable_percentage: "",
    features: [],
    is_active: true
  });
  const [newFeature, setNewFeature] = useState("");

  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Plan.create({
      ...data,
      monthly_value: data.monthly_value ? parseFloat(data.monthly_value) : null,
      variable_percentage: data.variable_percentage ? parseFloat(data.variable_percentage) : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Plan.update(id, {
      ...data,
      monthly_value: data.monthly_value ? parseFloat(data.monthly_value) : null,
      variable_percentage: data.variable_percentage ? parseFloat(data.variable_percentage) : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Plan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });

  const handleOpenDialog = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name || "",
        description: plan.description || "",
        monthly_value: plan.monthly_value?.toString() || "",
        variable_percentage: plan.variable_percentage?.toString() || "",
        features: plan.features || [],
        is_active: plan.is_active ?? true
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: "",
        description: "",
        monthly_value: "",
        variable_percentage: "",
        features: [],
        is_active: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPlan(null);
    setNewFeature("");
  };

  const handleSubmit = () => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Planos</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Configure os planos disponíveis para os clientes
            </p>
          </div>
          <Button 
            onClick={() => handleOpenDialog()} 
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </CardHeader>
      </Card>

      {/* Plans List */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum plano cadastrado"
              description="Crie o primeiro plano para começar"
              actionLabel="Novo Plano"
              onAction={() => handleOpenDialog()}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Variável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                            <Package className="h-4 w-4 text-violet-600" />
                          </div>
                          <span className="font-medium">{plan.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm text-slate-600 truncate">
                          {plan.description || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">
                            R$ {plan.monthly_value?.toLocaleString("pt-BR") || "0"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.variable_percentage ? `${plan.variable_percentage}%` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(plan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate(plan.id)}
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome do Plano *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Growth"
                />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o plano..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Valor Mensal (R$) *</Label>
                <Input
                  type="number"
                  value={formData.monthly_value}
                  onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Percentual Variável (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.variable_percentage}
                  onChange={(e) => setFormData({ ...formData, variable_percentage: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Features */}
            <div>
              <Label>Recursos Incluídos</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Digite um recurso..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                />
                <Button type="button" onClick={addFeature}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.features.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="is_active" className="font-normal cursor-pointer">
                Plano ativo
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-violet-600 hover:bg-violet-700"
              disabled={!formData.name || !formData.monthly_value}
            >
              {editingPlan ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}