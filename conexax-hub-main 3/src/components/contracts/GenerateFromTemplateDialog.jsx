import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function GenerateFromTemplateDialog({ open, onOpenChange, onSuccess }) {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [clientId, setClientId] = useState("");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["contractTemplates"],
    queryFn: () => base44.entities.ContractTemplate.filter({ status: "active" }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generateContractFromTemplate', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato gerado com sucesso!");
      onSuccess?.(data.contract);
      handleClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Erro ao gerar contrato");
    }
  });

  const handleGenerate = () => {
    if (!selectedTemplate || !clientId || !monthlyValue) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    generateMutation.mutate({
      template_id: selectedTemplate,
      contract_data: {
        client_id: clientId,
        monthly_value: parseFloat(monthlyValue),
        start_date: startDate || new Date().toISOString().split('T')[0],
        status: "draft"
      }
    });
  };

  const handleClose = () => {
    setSelectedTemplate("");
    setClientId("");
    setMonthlyValue("");
    setStartDate("");
    onOpenChange(false);
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#355340]" />
            Gerar Contrato a partir de Modelo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Modelo de Contrato *</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplateData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Descrição:</strong> {selectedTemplateData.description || "Sem descrição"}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Placeholders:</strong> {selectedTemplateData.placeholders?.length || 0} configurados
              </p>
            </div>
          )}

          <div>
            <Label>Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Mensal (R$) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={monthlyValue}
                onChange={(e) => setMonthlyValue(e.target.value)}
              />
            </div>

            <div>
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-600">
              Os campos do modelo serão preenchidos automaticamente com os dados do cliente 
              e contrato selecionados. Você poderá editar o contrato após a geração.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="bg-[#355340] hover:bg-[#355340]/90"
          >
            {generateMutation.isPending ? "Gerando..." : "Gerar Contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}