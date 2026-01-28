import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Search,
  FileText,
  Upload,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import PlaceholderMapper from "@/components/contracts/PlaceholderMapper";
import DynamicTemplateBuilder from "@/components/contracts/DynamicTemplateBuilder";
import { AuditPageView } from "@/components/audit/AuditLogger";
import { toast } from "sonner";

export default function ContractTemplates() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mapperDialogOpen, setMapperDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [mappingTemplate, setMappingTemplate] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "service",
    file_url: "",
    file_type: "docx",
    dynamic_fields: []
  });

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contractTemplates"],
    queryFn: () => base44.entities.ContractTemplate.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContractTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractTemplates"] });
      toast.success("Modelo criado com sucesso!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContractTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractTemplates"] });
      toast.success("Modelo atualizado!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContractTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractTemplates"] });
      toast.success("Modelo excluído!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato não suportado. Use .docx ou .pdf");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const fileType = file.type.includes("pdf") ? "pdf" : "docx";
      setFormData({ ...formData, file_url, file_type: fileType });
      toast.success("Arquivo enviado!");
    } catch (error) {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || "",
        category: template.category || "service",
        file_url: template.file_url,
        file_type: template.file_type || "docx",
        dynamic_fields: template.dynamic_fields || []
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        description: "",
        category: "service",
        file_url: "",
        file_type: "docx",
        dynamic_fields: []
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.file_url) {
      toast.error("Preencha nome e faça upload do arquivo");
      return;
    }

    if (editingTemplate) {
      updateMutation.mutate({ 
        id: editingTemplate.id, 
        data: formData 
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleOpenMapper = (template) => {
    setMappingTemplate(template);
    setMapperDialogOpen(true);
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = (template.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryLabels = {
    service: "Prestação de Serviços",
    sale: "Compra e Venda",
    partnership: "Parceria",
    nda: "Confidencialidade (NDA)",
    other: "Outros"
  };

  return (
    <>
      <AuditPageView pageName="ContractTemplates" />
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Modelos de Contratos</h1>
            <p className="text-slate-500 text-sm mt-1">
              Gerencie modelos com placeholders para geração automática
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-[#355340] hover:bg-[#355340]/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Modelo
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar modelos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="service">Prestação de Serviços</SelectItem>
                  <SelectItem value="sale">Compra e Venda</SelectItem>
                  <SelectItem value="partnership">Parceria</SelectItem>
                  <SelectItem value="nda">NDA</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum modelo encontrado"
            description="Crie modelos de contratos para usar na geração automática"
            actionLabel="Novo Modelo"
            onAction={() => handleOpenDialog()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{template.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[template.category]}
                      </Badge>
                    </div>
                    <div className="w-10 h-10 bg-[#62997f]/20 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-[#355340]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {template.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Tipo: {template.file_type?.toUpperCase()}</span>
                    <span>Usado {template.usage_count || 0}x</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenMapper(template)}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Mapear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Excluir este modelo?")) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Editar Modelo" : "Novo Modelo"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Modelo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Contrato de Prestação de Serviços"
                />
              </div>

              <div>
                <Label>Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Prestação de Serviços</SelectItem>
                    <SelectItem value="sale">Compra e Venda</SelectItem>
                    <SelectItem value="partnership">Parceria</SelectItem>
                    <SelectItem value="nda">NDA</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o modelo..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Arquivo do Modelo * (.docx ou .pdf)</Label>
                <div className="mt-2">
                  {formData.file_url ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-800 flex-1">Arquivo enviado</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, file_url: "" })}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-600">
                        {uploading ? "Enviando..." : "Clique para fazer upload"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Use placeholders no documento: {'{{nome_cliente}}'}, {'{{valor_mensal}}'}, etc.
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Campos Personalizáveis do Contrato</h3>
                <DynamicTemplateBuilder
                  template={formData}
                  onFieldsChange={(fields) => setFormData({ ...formData, dynamic_fields: fields })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#355340] hover:bg-[#355340]/90"
              >
                {editingTemplate ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mapper Dialog */}
        {mappingTemplate && (
          <PlaceholderMapper
            template={mappingTemplate}
            open={mapperDialogOpen}
            onOpenChange={setMapperDialogOpen}
          />
        )}
      </div>
    </>
  );
}