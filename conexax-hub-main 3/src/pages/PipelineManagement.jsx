import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function PipelineManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", is_default: false });
  const queryClient = useQueryClient();

  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => base44.entities.Pipeline.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pipeline.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      setDialogOpen(false);
      setFormData({ name: "", description: "", is_default: false });
      toast.success("Pipeline criado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pipeline.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Pipeline excluído");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    createMutation.mutate(formData);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciar Pipelines</h1>
          <p className="text-slate-500 text-sm mt-1">Organize seus processos em pipelines</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Pipeline
        </Button>
      </div>

      <div className="grid gap-4">
        {pipelines.map((pipeline) => (
          <Card key={pipeline.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{pipeline.name}</h3>
                  {pipeline.description && (
                    <p className="text-sm text-slate-500 mt-1">{pipeline.description}</p>
                  )}
                  {pipeline.is_default && (
                    <span className="inline-block mt-2 px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded">
                      Padrão
                    </span>
                  )}
                </div>
                <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(pipeline.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Pipeline</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Vendas, Onboarding"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
              <Label>Definir como padrão</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}