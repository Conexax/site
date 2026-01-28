import React, { useState } from "react";
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
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function CustomFieldsManager({ customFields = {}, onChange }) {
  const [fields, setFields] = useState(customFields);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const handleAddField = () => {
    if (!newFieldKey.trim()) {
      toast.error("Digite o nome do campo");
      return;
    }

    if (fields[newFieldKey]) {
      toast.error("Este campo já existe");
      return;
    }

    const updatedFields = {
      ...fields,
      [newFieldKey]: {
        value: newFieldValue,
        type: newFieldType
      }
    };

    setFields(updatedFields);
    onChange(updatedFields);
    setNewFieldKey("");
    setNewFieldValue("");
    setNewFieldType("text");
    toast.success("Campo adicionado");
  };

  const handleRemoveField = (key) => {
    const { [key]: removed, ...rest } = fields;
    setFields(rest);
    onChange(rest);
    toast.success("Campo removido");
  };

  const handleStartEdit = (key) => {
    setEditingKey(key);
    setEditingValue(fields[key].value);
  };

  const handleSaveEdit = () => {
    if (editingKey) {
      const updatedFields = {
        ...fields,
        [editingKey]: {
          ...fields[editingKey],
          value: editingValue
        }
      };
      setFields(updatedFields);
      onChange(updatedFields);
      setEditingKey(null);
      setEditingValue("");
      toast.success("Campo atualizado");
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditingValue("");
  };

  const formatFieldName = (key) => {
    return key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">Campos Customizados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campos existentes */}
        {Object.keys(fields).length > 0 && (
          <div className="space-y-2">
            {Object.entries(fields).map(([key, field]) => (
              <div key={key} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                {editingKey === key ? (
                  <>
                    <div className="flex-1">
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        placeholder="Valor"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSaveEdit}
                      className="h-8 w-8 text-green-600"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8 w-8 text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {formatFieldName(key)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {field.value || "-"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStartEdit(key)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveField(key)}
                      className="h-8 w-8 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Adicionar novo campo */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <p className="text-sm font-medium text-slate-700">Adicionar Novo Campo</p>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Nome do campo"
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
            />
            <Input
              placeholder="Valor"
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
            />
            <Select value={newFieldType} onValueChange={setNewFieldType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="url">URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddField}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Campo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}