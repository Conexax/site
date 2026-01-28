import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Archive,
  CheckCircle,
  Clock,
  History,
  Trash2,
  Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function ContractLibrary() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    plan_id: "",
    template_name: "",
    content: "",
    allow_discount: false,
    allow_setup_fee: false,
    allow_custom_duration: false,
    status: "draft"
  });

  React.useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contractTemplates"],
    queryFn: () => base44.entities.ContractTemplate.list("-created_date"),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContractTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractTemplates"] });
      setDialogOpen(false);
      resetForm();
      toast.success("Modelo criado com sucesso");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContractTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractTemplates"] });
      setDialogOpen(false);
      resetForm();
      toast.success("Modelo atualizado com sucesso");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContractTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractTemplates"] });
      toast.success("Modelo excluído com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir modelo");
    }
  });

  const resetForm = () => {
    setFormData({
      plan_id: "",
      template_name: "",
      content: "",
      allow_discount: false,
      allow_setup_fee: false,
      allow_custom_duration: false,
      status: "draft"
    });
    setEditingTemplate(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (template) => {
    setFormData({
      plan_id: template.plan_id,
      template_name: template.template_name,
      content: template.content,
      allow_discount: template.allow_discount || false,
      allow_setup_fee: template.allow_setup_fee || false,
      allow_custom_duration: template.allow_custom_duration || false,
      status: template.status
    });
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleView = (template) => {
    setViewingTemplate(template);
    setViewDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, version: 1 });
    }
  };

  const handlePrint = (template) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${template.template_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #355340; margin-bottom: 20px; }
            pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${template.template_name}</h1>
          <p><strong>Plano:</strong> ${getPlanName(template.plan_id)}</p>
          <p><strong>Status:</strong> ${template.status === 'active' ? 'Ativo' : template.status === 'draft' ? 'Rascunho' : 'Arquivado'}</p>
          <hr />
          <pre>${template.content}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.template_name?.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || t.plan_id === planFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanName = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.name || "Plano não encontrado";
  };

  const isAdmin = user?.role === "admin";

  const defaultTemplate = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{COMPANY_NAME}}
CNPJ: {{CNPJ}}
Responsável: {{RESPONSIBLE_NAME}}
E-mail: {{EMAIL}}
Telefone: {{PHONE}}

CONTRATADA: ConexaX Gestão de E-commerce

OBJETO: Prestação de serviços de gestão e consultoria para e-commerce.

PLANO CONTRATADO: {{PLAN_NAME}}

VALORES:
- Mensalidade: {{FINAL_MONTHLY_VALUE}}
- Taxa de Setup: {{SETUP_FEE}}
- Desconto Aplicado: {{DISCOUNT_PERCENTAGE}}%

VIGÊNCIA: {{VALIDITY_MONTHS}} meses
Início: {{START_DATE}}
Término: {{END_DATE}}

Número do Contrato: {{CONTRACT_NUMBER}}
Gerado em: {{GENERATION_DATE}} por {{GENERATED_BY}}`;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Biblioteca de Contratos</h1>
          <p className="text-slate-500 text-sm mt-1">Modelos de contrato por plano</p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenNew} className="bg-[#355340] hover:bg-[#355340]/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Modelo
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar modelos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                {plans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
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
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="Nenhum modelo encontrado"
              description={isAdmin ? "Crie um novo modelo para começar" : "Aguardando modelos"}
              actionLabel={isAdmin ? "Novo Modelo" : undefined}
              onAction={isAdmin ? handleOpenNew : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.template_name}</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">{getPlanName(template.plan_id)}</p>
                  </div>
                  <Badge className={
                    template.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    template.status === 'draft' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                    'bg-amber-100 text-amber-800 border-amber-200'
                  }>
                    {template.status === 'active' ? 'Ativo' : template.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <History className="h-3 w-3" />
                  Versão {template.version}
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.allow_discount && (
                    <Badge variant="outline" className="text-xs">Desconto</Badge>
                  )}
                  {template.allow_setup_fee && (
                    <Badge variant="outline" className="text-xs">Setup</Badge>
                  )}
                  {template.allow_custom_duration && (
                    <Badge variant="outline" className="text-xs">Duração Custom</Badge>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleView(template)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePrint(template)}
                  >
                    <Printer className="h-3 w-3" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenEdit(template)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir "${template.template_name}"?`)) {
                            deleteMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Modelo" : "Novo Modelo de Contrato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Modelo</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="Ex: Contrato Padrão - Growth"
                />
              </div>
              <div>
                <Label>Plano</Label>
                <Select value={formData.plan_id} onValueChange={(v) => setFormData({ ...formData, plan_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Conteúdo do Modelo</Label>
              <p className="text-xs text-slate-500 mb-2">
                Use variáveis com chaves duplas: COMPANY_NAME, CNPJ, PLAN_NAME, MONTHLY_VALUE, CONTRACT_NUMBER, START_DATE, etc.
              </p>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="font-mono text-xs"
                placeholder={defaultTemplate}
              />
            </div>

            <div className="space-y-3">
              <Label>Opções Permitidas na Geração</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Permitir Desconto</p>
                    <p className="text-xs text-slate-500">Closer pode aplicar desconto</p>
                  </div>
                  <Switch
                    checked={formData.allow_discount}
                    onCheckedChange={(v) => setFormData({ ...formData, allow_discount: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Permitir Taxa de Setup</p>
                    <p className="text-xs text-slate-500">Closer pode adicionar setup</p>
                  </div>
                  <Switch
                    checked={formData.allow_setup_fee}
                    onCheckedChange={(v) => setFormData({ ...formData, allow_setup_fee: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Permitir Duração Customizada</p>
                    <p className="text-xs text-slate-500">Closer pode ajustar prazo</p>
                  </div>
                  <Switch
                    checked={formData.allow_custom_duration}
                    onCheckedChange={(v) => setFormData({ ...formData, allow_custom_duration: v })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.plan_id || !formData.template_name || !formData.content}
              className="bg-[#355340] hover:bg-[#355340]/90"
            >
              {editingTemplate ? "Atualizar" : "Criar"} Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingTemplate?.template_name}</DialogTitle>
            <p className="text-sm text-slate-500">{viewingTemplate && getPlanName(viewingTemplate.plan_id)}</p>
          </DialogHeader>
          {viewingTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={
                  viewingTemplate.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                  viewingTemplate.status === 'draft' ? 'bg-slate-100 text-slate-800' :
                  'bg-amber-100 text-amber-800'
                }>
                  {viewingTemplate.status === 'active' ? 'Ativo' : viewingTemplate.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                </Badge>
                <Badge variant="outline">Versão {viewingTemplate.version}</Badge>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700">
                  {viewingTemplate.content}
                </pre>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Desconto</p>
                  <p className="text-sm font-medium mt-1">
                    {viewingTemplate.allow_discount ? "Permitido" : "Não permitido"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Setup</p>
                  <p className="text-sm font-medium mt-1">
                    {viewingTemplate.allow_setup_fee ? "Permitido" : "Não permitido"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Duração Custom</p>
                  <p className="text-sm font-medium mt-1">
                    {viewingTemplate.allow_custom_duration ? "Permitido" : "Não permitido"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => handlePrint(viewingTemplate)}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}