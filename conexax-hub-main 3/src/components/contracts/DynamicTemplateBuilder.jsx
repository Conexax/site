import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DynamicTemplateBuilder({ template, onFieldsChange }) {
  const [fields, setFields] = useState(template?.dynamic_fields || []);
  const [newField, setNewField] = useState({
    key: "",
    label: "",
    type: "text",
    required: false,
    placeholder: ""
  });

  const addField = () => {
    if (!newField.key || !newField.label) {
      toast.error("Preencha chave e rótulo do campo");
      return;
    }
    const updated = [...fields, { ...newField, options: [] }];
    setFields(updated);
    onFieldsChange(updated);
    setNewField({ key: "", label: "", type: "text", required: false, placeholder: "" });
    toast.success("Campo adicionado");
  };

  const removeField = (index) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
    onFieldsChange(updated);
  };

  const updateField = (index, updates) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
    onFieldsChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
        <h3 className="font-semibold text-sm">Novo Campo</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Chave (ex: client_name)"
            value={newField.key}
            onChange={(e) => setNewField({ ...newField, key: e.target.value })}
          />
          <Input
            placeholder="Rótulo (ex: Nome do Cliente)"
            value={newField.label}
            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={newField.type} onValueChange={(v) => setNewField({ ...newField, type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="number">Número</SelectItem>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="select">Seleção</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newField.required}
              onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
              id="required"
            />
            <Label htmlFor="required" className="text-sm cursor-pointer">Obrigatório</Label>
          </div>
        </div>
        <Button onClick={addField} size="sm" className="w-full bg-[#355340] hover:bg-[#355340]/90">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Campo
        </Button>
      </div>

      {fields.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Campos Configurados</h3>
          {fields.map((field, idx) => (
            <Card key={idx} className="border-slate-200">
              <CardContent className="pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500">Chave</Label>
                    <p className="font-mono text-sm">{field.key}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Rótulo</Label>
                    <p className="text-sm">{field.label}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500">Tipo</Label>
                    <p className="text-sm capitalize">{field.type}</p>
                  </div>
                  <div className="flex items-end gap-2">
                    {field.required && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Obrigatório</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeField(idx)}
                  className="w-full text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Remover
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}