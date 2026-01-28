import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PipelineVisual({ entityType = 'lead', data = [] }) {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  const { data: pipelineConfig } = useQuery({
    queryKey: ['pipeline-config', entityType],
    queryFn: async () => {
      const configs = await base44.entities.PipelineConfig.filter(
        { type: entityType, is_default: true }
      );
      return configs[0] || null;
    }
  });

  const updateEntityStageMutation = useMutation({
    mutationFn: async ({ id, newStage }) => {
      const entity = entityType === 'lead' ? base44.entities.Lead : base44.entities.Client;
      return await entity.update(id, { pipeline_stage: newStage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success("Estágio atualizado");
    }
  });

  const stages = pipelineConfig?.stages || [];
  
  const stageGroups = stages.reduce((acc, stage) => {
    if (!acc[stage.id]) acc[stage.id] = [];
    return acc;
  }, {});

  data.forEach(item => {
    const stage = item.pipeline_stage || stages[0]?.id;
    if (stageGroups[stage]) {
      stageGroups[stage].push(item);
    }
  });

  const handleDragStart = (e, item, sourceStage) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("item", JSON.stringify({ item, sourceStage }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("item"));
    if (data.sourceStage !== targetStage) {
      updateEntityStageMutation.mutate({
        id: data.item.id,
        newStage: targetStage
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pipeline Visual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-full pb-4">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 p-4"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm">{stage.name}</h3>
                    <p className="text-xs text-gray-500">{stageGroups[stage.id]?.length || 0} itens</p>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color || '#62997f' }}
                  />
                </div>

                <div className="space-y-2">
                  {(stageGroups[stage.id] || []).map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item, stage.id)}
                      onClick={() => {
                        setSelectedEntity(item);
                        setShowDetails(true);
                      }}
                      className="bg-white p-3 rounded-lg border border-gray-200 cursor-move hover:shadow-md transition hover:border-[#62997f]"
                    >
                      <p className="font-medium text-sm truncate">{item.name || item.company_name}</p>
                      <p className="text-xs text-gray-600 truncate">{item.email || item.responsible_name}</p>
                      {item.monthly_value && (
                        <p className="text-xs font-semibold text-[#62997f] mt-1">
                          R$ {item.monthly_value.toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {data.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum item para exibir no pipeline
          </div>
        )}
      </CardContent>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEntity?.name || selectedEntity?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{selectedEntity?.email}</p>
            </div>
            {selectedEntity?.phone && (
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <p className="font-medium">{selectedEntity?.phone}</p>
              </div>
            )}
            {selectedEntity?.monthly_value && (
              <div>
                <p className="text-sm text-gray-600">Valor Mensal</p>
                <p className="font-medium text-lg text-[#62997f]">
                  R$ {selectedEntity?.monthly_value.toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            {selectedEntity?.description && (
              <div>
                <p className="text-sm text-gray-600">Descrição</p>
                <p className="text-sm">{selectedEntity?.description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}