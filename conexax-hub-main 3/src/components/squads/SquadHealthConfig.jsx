import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Settings } from "lucide-react";
import { toast } from "sonner";

export default function SquadHealthConfigDialog({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    calculation_period_days: 30,
    capacity_weight: 25,
    sla_weight: 35,
    demand_volume_weight: 20,
    backlog_weight: 20,
    healthy_threshold: 70,
    stretched_threshold: 50
  });

  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ["squadHealthConfig"],
    queryFn: () => base44.entities.SquadHealthConfig.filter({ is_default: true }),
  });

  React.useEffect(() => {
    if (configs && configs.length > 0) {
      const config = configs[0];
      setFormData({
        calculation_period_days: config.calculation_period_days || 30,
        capacity_weight: config.capacity_weight || 25,
        sla_weight: config.sla_weight || 35,
        demand_volume_weight: config.demand_volume_weight || 20,
        backlog_weight: config.backlog_weight || 20,
        healthy_threshold: config.healthy_threshold || 70,
        stretched_threshold: config.stretched_threshold || 50
      });
    }
  }, [configs]);

  const totalWeight = formData.capacity_weight + formData.sla_weight + 
                     formData.demand_volume_weight + formData.backlog_weight;

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (configs && configs.length > 0) {
        return base44.entities.SquadHealthConfig.update(configs[0].id, data);
      } else {
        return base44.entities.SquadHealthConfig.create({
          name: "Configuração Padrão",
          is_default: true,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squadHealthConfig"] });
      toast.success("Configuração atualizada!");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const handleSubmit = () => {
    if (totalWeight !== 100) {
      toast.error("A soma dos pesos deve ser 100%");
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Saúde do Squad
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label>Período de Cálculo (dias)</Label>
            <Input
              type="number"
              min="1"
              max="90"
              value={formData.calculation_period_days}
              onChange={(e) => setFormData({
                ...formData,
                calculation_period_days: parseInt(e.target.value) || 30
              })}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">
              Período de análise para calcular os fatores de saúde
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="flex justify-between">
                <span>Peso - Capacidade</span>
                <span className="font-semibold">{formData.capacity_weight}%</span>
              </Label>
              <Slider
                value={[formData.capacity_weight]}
                onValueChange={(v) => setFormData({
                  ...formData,
                  capacity_weight: v[0]
                })}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                % de contas vs capacidade máxima
              </p>
            </div>

            <div>
              <Label className="flex justify-between">
                <span>Peso - SLA</span>
                <span className="font-semibold">{formData.sla_weight}%</span>
              </Label>
              <Slider
                value={[formData.sla_weight]}
                onValueChange={(v) => setFormData({
                  ...formData,
                  sla_weight: v[0]
                })}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                % de SLA cumprido
              </p>
            </div>

            <div>
              <Label className="flex justify-between">
                <span>Peso - Volume de Demandas</span>
                <span className="font-semibold">{formData.demand_volume_weight}%</span>
              </Label>
              <Slider
                value={[formData.demand_volume_weight]}
                onValueChange={(v) => setFormData({
                  ...formData,
                  demand_volume_weight: v[0]
                })}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                Demandas/tickets criadas
              </p>
            </div>

            <div>
              <Label className="flex justify-between">
                <span>Peso - Backlog</span>
                <span className="font-semibold">{formData.backlog_weight}%</span>
              </Label>
              <Slider
                value={[formData.backlog_weight]}
                onValueChange={(v) => setFormData({
                  ...formData,
                  backlog_weight: v[0]
                })}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                Demandas abertas e idade média
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm font-medium">
              Total de pesos: <span className={totalWeight === 100 ? 'text-emerald-600' : 'text-red-600'}>
                {totalWeight}%
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Limite - Saudável</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.healthy_threshold}
                onChange={(e) => setFormData({
                  ...formData,
                  healthy_threshold: parseInt(e.target.value) || 70
                })}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Score mínimo 🟢</p>
            </div>

            <div>
              <Label>Limite - Esticado</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.stretched_threshold}
                onChange={(e) => setFormData({
                  ...formData,
                  stretched_threshold: parseInt(e.target.value) || 50
                })}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Score mínimo 🟡</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#355340] hover:bg-[#355340]/90"
            disabled={totalWeight !== 100}
          >
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}