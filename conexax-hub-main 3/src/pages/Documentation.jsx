import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Book, Plus, Edit2, Trash2, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const itemTypeLabels = {
  page: "Página",
  component: "Componente",
  entity: "Entidade",
  function: "Função",
  automation: "Automação",
  integration: "Integração",
  agent: "Agente"
};

const itemTypeColors = {
  page: "bg-blue-100 text-blue-800",
  component: "bg-purple-100 text-purple-800",
  entity: "bg-green-100 text-green-800",
  function: "bg-orange-100 text-orange-800",
  automation: "bg-pink-100 text-pink-800",
  integration: "bg-indigo-100 text-indigo-800",
  agent: "bg-cyan-100 text-cyan-800"
};

export default function DocumentationPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error(error);
      }
    };
    loadUser();
  }, []);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documentation'],
    queryFn: () => base44.entities.Documentation.list('order')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Documentation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['documentation']);
      toast.success("Documentação criada");
      handleCloseDialog();
    },
    onError: () => toast.error("Erro ao criar documentação")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Documentation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['documentation']);
      toast.success("Documentação atualizada");
      handleCloseDialog();
    },
    onError: () => toast.error("Erro ao atualizar documentação")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Documentation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['documentation']);
      toast.success("Documentação excluída");
    },
    onError: () => toast.error("Erro ao excluir documentação")
  });

  const [formData, setFormData] = useState({
    item_name: "",
    item_type: "page",
    short_description: "",
    when_to_use: "",
    how_it_works: "",
    configuration: "",
    inputs: "",
    outputs: "",
    states_feedback: "",
    permissions: "",
    dependencies: "",
    common_errors: "",
    practical_example: "",
    acceptance_criteria: "",
    order: 0
  });

  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormData({
      item_name: "",
      item_type: "page",
      short_description: "",
      when_to_use: "",
      how_it_works: "",
      configuration: "",
      inputs: "",
      outputs: "",
      states_feedback: "",
      permissions: "",
      dependencies: "",
      common_errors: "",
      practical_example: "",
      acceptance_criteria: "",
      order: docs.length
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingDoc(doc);
    setFormData(doc);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDoc(null);
  };

  const handleSubmit = () => {
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleView = (doc) => {
    setViewingDoc(doc);
    setViewDialogOpen(true);
  };

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.short_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || doc.item_type === filterType;
    return matchesSearch && matchesType;
  });

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Book className="h-8 w-8 text-[#355340]" />
              Documentação do Sistema
            </h1>
            <p className="text-slate-500 mt-1">
              Documentação padronizada de todos os itens da aplicação
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleOpenCreate} className="bg-[#355340] hover:bg-[#355340]/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Documentação
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(itemTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documentation List */}
        {isLoading ? (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">Carregando documentação...</p>
            </CardContent>
          </Card>
        ) : filteredDocs.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <Book className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm || filterType !== "all" ? "Nenhum resultado encontrado" : "Nenhuma documentação criada"}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchTerm || filterType !== "all" 
                  ? "Tente ajustar os filtros de busca"
                  : "Crie a primeira documentação seguindo o template padrão"}
              </p>
              {isAdmin && !searchTerm && filterType === "all" && (
                <Button onClick={handleOpenCreate} className="bg-[#355340] hover:bg-[#355340]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Documentação
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredDocs.map((doc) => (
              <Card 
                key={doc.id} 
                className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleView(doc)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{doc.item_name}</CardTitle>
                        <Badge className={itemTypeColors[doc.item_type]}>
                          {itemTypeLabels[doc.item_type]}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{doc.short_description}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenEdit(doc)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteMutation.mutate(doc.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingDoc && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-slate-900">{viewingDoc.item_name}</h1>
                  <Badge className={itemTypeColors[viewingDoc.item_type]}>
                    {itemTypeLabels[viewingDoc.item_type]}
                  </Badge>
                </div>
              </div>

              <Section title="Descrição" content={viewingDoc.short_description} />
              <Section title="Quando usar" content={viewingDoc.when_to_use} />
              <Section title="Como funciona" content={viewingDoc.how_it_works} />
              <Section title="Configuração" content={viewingDoc.configuration} />
              <Section title="Entradas" content={viewingDoc.inputs} />
              <Section title="Saídas" content={viewingDoc.outputs} />
              <Section title="Estados e feedback" content={viewingDoc.states_feedback} />
              <Section title="Permissões e restrições" content={viewingDoc.permissions} />
              <Section title="Dependências" content={viewingDoc.dependencies} />
              <Section title="Erros comuns" content={viewingDoc.common_errors} />
              <Section title="Exemplo prático" content={viewingDoc.practical_example} />
              <Section title="Critérios de aceite" content={viewingDoc.acceptance_criteria} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Editar Documentação" : "Nova Documentação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Item *</Label>
                <Input
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="Ex: Dashboard"
                />
              </div>
              <div>
                <Label>Tipo do Item *</Label>
                <Select value={formData.item_type} onValueChange={(v) => setFormData({ ...formData, item_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(itemTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição curta (máx. 3 linhas) *</Label>
              <Textarea
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                rows={2}
                placeholder="O que é e para que serve..."
              />
            </div>

            <div>
              <Label>Quando usar</Label>
              <Textarea
                value={formData.when_to_use}
                onChange={(e) => setFormData({ ...formData, when_to_use: e.target.value })}
                rows={3}
                placeholder="Cenários práticos de uso e quando não usar..."
              />
            </div>

            <div>
              <Label>Como funciona</Label>
              <Textarea
                value={formData.how_it_works}
                onChange={(e) => setFormData({ ...formData, how_it_works: e.target.value })}
                rows={3}
                placeholder="Explicação resumida do funcionamento e principais regras..."
              />
            </div>

            <div>
              <Label>Configuração</Label>
              <Textarea
                value={formData.configuration}
                onChange={(e) => setFormData({ ...formData, configuration: e.target.value })}
                rows={4}
                placeholder="Passo a passo para configurar, campos obrigatórios e opcionais..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Entradas</Label>
                <Textarea
                  value={formData.inputs}
                  onChange={(e) => setFormData({ ...formData, inputs: e.target.value })}
                  rows={3}
                  placeholder="Dados de entrada e validações..."
                />
              </div>
              <div>
                <Label>Saídas</Label>
                <Textarea
                  value={formData.outputs}
                  onChange={(e) => setFormData({ ...formData, outputs: e.target.value })}
                  rows={3}
                  placeholder="Resultado esperado e ações executadas..."
                />
              </div>
            </div>

            <div>
              <Label>Estados e feedback</Label>
              <Textarea
                value={formData.states_feedback}
                onChange={(e) => setFormData({ ...formData, states_feedback: e.target.value })}
                rows={3}
                placeholder="Estados possíveis (vazio, carregando, sucesso, erro) e mensagens..."
              />
            </div>

            <div>
              <Label>Permissões e restrições</Label>
              <Textarea
                value={formData.permissions}
                onChange={(e) => setFormData({ ...formData, permissions: e.target.value })}
                rows={3}
                placeholder="Quem pode visualizar, criar, editar e remover..."
              />
            </div>

            <div>
              <Label>Dependências</Label>
              <Textarea
                value={formData.dependencies}
                onChange={(e) => setFormData({ ...formData, dependencies: e.target.value })}
                rows={2}
                placeholder="Outros módulos, agentes ou serviços necessários..."
              />
            </div>

            <div>
              <Label>Erros comuns</Label>
              <Textarea
                value={formData.common_errors}
                onChange={(e) => setFormData({ ...formData, common_errors: e.target.value })}
                rows={3}
                placeholder="Problemas frequentes e como resolver..."
              />
            </div>

            <div>
              <Label>Exemplo prático</Label>
              <Textarea
                value={formData.practical_example}
                onChange={(e) => setFormData({ ...formData, practical_example: e.target.value })}
                rows={4}
                placeholder="Exemplo simples e real de uso..."
              />
            </div>

            <div>
              <Label>Critérios de aceite</Label>
              <Textarea
                value={formData.acceptance_criteria}
                onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
                rows={3}
                placeholder="Checklist para considerar o item documentado corretamente..."
              />
            </div>

            <div>
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleSubmit}
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={!formData.item_name || !formData.short_description}
            >
              {editingDoc ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, content }) {
  if (!content) return null;
  
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#355340] mb-2">{title}</h3>
      <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-200">
        {content}
      </div>
    </div>
  );
}