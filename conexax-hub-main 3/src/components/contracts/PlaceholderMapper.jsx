import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_FIELDS = [
  { value: "client.company_name", label: "Nome do Cliente" },
  { value: "client.cnpj", label: "CNPJ" },
  { value: "client.responsible_name", label: "Responsável" },
  { value: "client.email", label: "E-mail Cliente" },
  { value: "client.phone", label: "Telefone Cliente" },
  { value: "contract.contract_number", label: "Número do Contrato" },
  { value: "contract.monthly_value", label: "Valor Mensal" },
  { value: "contract.variable_percentage", label: "Percentual Variável" },
  { value: "contract.start_date", label: "Data de Início" },
  { value: "contract.end_date", label: "Data de Término" },
  { value: "contract.validity_months", label: "Vigência (meses)" },
  { value: "current_date", label: "Data Atual" },
  { value: "current_year", label: "Ano Atual" },
];

export default function PlaceholderMapper({ template, open, onOpenChange }) {
  const [placeholders, setPlaceholders] = useState(
    template?.placeholders || []
  );
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ContractTemplate.update(template.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractTemplates"] });
      toast.success("Mapeamento salvo com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });

  const handleAddPlaceholder = () => {
    setPlaceholders([
      ...placeholders,
      {
        key: "",
        label: "",
        mapped_field: "",
        default_value: ""
      }
    ]);
  };

  const handleRemovePlaceholder = (index) => {
    setPlaceholders(placeholders.filter((_, i) => i !== index));
  };

  const handleUpdatePlaceholder = (index, field, value) => {
    const updated = [...placeholders];
    updated[index][field] = value;
    setPlaceholders(updated);
  };

  const handleSave = () => {
    // Validar
    const hasEmpty = placeholders.some(p => !p.key || !p.label);
    if (hasEmpty) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    updateMutation.mutate({
      placeholders: placeholders
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mapear Placeholders - {template?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Como usar:</strong> Defina os placeholders que existem no seu documento 
              (ex: {'{{nome_cliente}}'}) e mapeie-os para campos do sistema. 
              Ao gerar um contrato, esses valores serão preenchidos automaticamente.
            </p>
          </div>

          {placeholders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>Nenhum placeholder definido.</p>
              <p className="text-sm mt-1">Clique em "Adicionar Placeholder" para começar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {placeholders.map((placeholder, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-700">Placeholder #{index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePlaceholder(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Chave no Documento *</Label>
                      <Input
                        placeholder="Ex: nome_cliente"
                        value={placeholder.key}
                        onChange={(e) => handleUpdatePlaceholder(index, "key", e.target.value)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Use no documento: {`{{${placeholder.key || "chave"}}}`}
                      </p>
                    </div>

                    <div>
                      <Label>Nome de Exibição *</Label>
                      <Input
                        placeholder="Ex: Nome do Cliente"
                        value={placeholder.label}
                        onChange={(e) => handleUpdatePlaceholder(index, "label", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Mapear para Campo</Label>
                      <Select
                        value={placeholder.mapped_field}
                        onValueChange={(v) => handleUpdatePlaceholder(index, "mapped_field", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um campo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Nenhum (usar valor padrão)</SelectItem>
                          {AVAILABLE_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Valor Padrão</Label>
                      <Input
                        placeholder="Valor se campo não mapeado"
                        value={placeholder.default_value}
                        onChange={(e) => handleUpdatePlaceholder(index, "default_value", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleAddPlaceholder}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Placeholder
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-[#355340] hover:bg-[#355340]/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Salvando..." : "Salvar Mapeamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}