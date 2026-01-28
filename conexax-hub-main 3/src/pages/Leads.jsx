import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { 
  Search, 
  Mail, 
  Phone, 
  Building2, 
  DollarSign, 
  TrendingUp,
  Trash2,
  Eye,
  Download,
  Copy,
  CheckCircle2,
  Link as LinkIcon,
  ExternalLink,
  Plus,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import GenerateContractWizard from "@/components/contracts/GenerateContractWizard";
import { Textarea } from "@/components/ui/textarea";
import { AuditPageView } from "@/components/audit/AuditLogger";
import AdvancedSearch from "@/components/search/AdvancedSearch";
import SortableHeader from "@/components/search/SortableHeader";
import LeadPipelineView from "@/components/leads/LeadPipelineView";
import HandoffDialog from "@/components/leads/HandoffDialog";
import HandoffHistory from "@/components/leads/HandoffHistory";

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [savedFilters, setSavedFilters] = useState(() => {
    const saved = localStorage.getItem("leads_filters");
    return saved ? JSON.parse(saved) : [];
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [selectedLead, setSelectedLead] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    segment: "",
    message: "",
    source: "Manual",
    pipeline_stage: "captado"
  });
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date"),
  });

  const { data: webhookConfigs = [] } = useQuery({
    queryKey: ["webhookConfigs"],
    queryFn: () => base44.entities.WebhookConfig.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  useEffect(() => {
    if (webhookConfigs.length > 0) {
      const baseUrl = window.location.origin;
      const token = webhookConfigs[0].token;
      setWebhookUrl(`${baseUrl}/api/webhook/${token}`);
    }
  }, [webhookConfigs]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Lead.update(id, { status }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (variables.status === 'qualificado') {
        toast.success("Lead qualificado! Conversão para cliente em andamento...");
      }
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: (leadData) => base44.entities.Lead.create(leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setCreateDialogOpen(false);
      setNewLead({
        name: "",
        email: "",
        phone: "",
        company: "",
        segment: "",
        message: "",
        source: "Manual",
        pipeline_stage: "captado"
      });
      toast.success("Lead criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar lead: ${error.message}`);
    }
  });

  const handleCreateLead = () => {
    if (!newLead.name || !newLead.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    createLeadMutation.mutate(newLead);
  };

  const handleSaveFilter = (filter) => {
    const newFilters = [...savedFilters, filter];
    setSavedFilters(newFilters);
    localStorage.setItem("leads_filters", JSON.stringify(newFilters));
    toast.success("Filtro salvo com sucesso");
  };

  const handleDeleteFilter = (index) => {
    const newFilters = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newFilters);
    localStorage.setItem("leads_filters", JSON.stringify(newFilters));
  };

  const advancedSearchFields = [
    { key: "name", label: "Nome", type: "text", placeholder: "Nome do lead..." },
    { key: "email", label: "E-mail", type: "text", placeholder: "E-mail..." },
    { key: "phone", label: "Telefone", type: "text", placeholder: "Telefone..." },
    { key: "segment", label: "Segmento", type: "text", placeholder: "Segmento..." },
    { 
      key: "source", 
      label: "Origem", 
      type: "select",
      options: [
        { value: "Elementor", label: "Elementor" },
        { value: "Manual", label: "Manual" }
      ]
    }
  ];

  const filteredLeads = leads
    .filter((lead) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        lead.name?.toLowerCase().includes(search) ||
        lead.email?.toLowerCase().includes(search) ||
        lead.phone?.toLowerCase().includes(search)
      );
      const matchesStatus = statusFilter === "all" || lead.pipeline_stage === statusFilter;

      // Filtros avançados
      if (advancedFilters.name && !lead.name?.toLowerCase().includes(advancedFilters.name.toLowerCase())) {
        return false;
      }
      if (advancedFilters.email && !lead.email?.toLowerCase().includes(advancedFilters.email.toLowerCase())) {
        return false;
      }
      if (advancedFilters.phone && !lead.phone?.includes(advancedFilters.phone)) {
        return false;
      }
      if (advancedFilters.segment && !lead.segment?.toLowerCase().includes(advancedFilters.segment.toLowerCase())) {
        return false;
      }
      if (advancedFilters.source && lead.source !== advancedFilters.source) {
        return false;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || "";
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const handleViewDetails = (lead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
  };

  const exportToCSV = () => {
    const headers = ["Nome", "Email", "Telefone", "Status", "Origem", "Data"];
    const rows = filteredLeads.map((lead) => [
      lead.name || "",
      lead.email || "",
      lead.phone || "",
      lead.status || "",
      lead.source || "",
      lead.created_date ? format(new Date(lead.created_date), "dd/MM/yyyy HH:mm") : ""
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateContract = (lead) => {
    if (lead.converted_client_id) {
      const client = clients.find(c => c.id === lead.converted_client_id);
      if (client) {
        setSelectedClient(client);
        setGenerateDialogOpen(true);
      }
    } else {
      toast.error("Lead ainda não foi convertido para cliente");
    }
  };

  return (
    <>
      <AuditPageView pageName="Leads" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-500 text-sm mt-1">
            {filteredLeads.length} lead(s) recebido(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="bg-[#355340] hover:bg-[#355340]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Lead Manual
          </Button>
          <Button 
            onClick={exportToCSV} 
            variant="outline"
            disabled={filteredLeads.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Webhook URL Section */}
      {webhookUrl && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <LinkIcon className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">URL da API para Formulários</h3>
                <p className="text-xs text-slate-600 mb-3">
                  Use esta URL no seu formulário do Elementor para receber leads automaticamente
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-700 overflow-x-auto">
                    {webhookUrl}
                  </div>
                  <Button
                    onClick={copyWebhookUrl}
                    size="sm"
                    variant={copied ? "default" : "outline"}
                    className={copied ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de Leads</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{leads.length}</p>
              </div>
              <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Hoje</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {leads.filter(l => {
                    const today = new Date().toDateString();
                    const leadDate = l.created_date ? new Date(l.created_date).toDateString() : null;
                    return leadDate === today;
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Esta Semana</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {leads.filter(l => {
                    if (!l.created_date) return false;
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(l.created_date) >= weekAgo;
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Este Mês</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {leads.filter(l => {
                    if (!l.created_date) return false;
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return new Date(l.created_date) >= monthAgo;
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Busca rápida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Estágios</SelectItem>
                <SelectItem value="captado">Captado</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
                <SelectItem value="handoff">Handoff</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AdvancedSearch
            fields={advancedSearchFields}
            onSearch={setAdvancedFilters}
            savedFilters={savedFilters}
            onSaveFilter={handleSaveFilter}
            onDeleteFilter={handleDeleteFilter}
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Nenhum lead encontrado</p>
              <p className="text-slate-500 text-sm mt-1">
                {searchTerm ? "Tente buscar com outros termos" : "Os leads recebidos aparecerão aqui"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortableHeader 
                        label="Nome" 
                        sortKey="name"
                        currentSort={sortConfig}
                        onSort={setSortConfig}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader 
                        label="Email" 
                        sortKey="email"
                        currentSort={sortConfig}
                        onSort={setSortConfig}
                      />
                    </TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>Conversão</TableHead>
                    <TableHead>
                      <SortableHeader 
                        label="Data" 
                        sortKey="created_date"
                        currentSort={sortConfig}
                        onSort={setSortConfig}
                      />
                    </TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.name || "-"}</div>
                        {lead.formName && (
                          <div className="text-xs text-slate-500 mt-0.5">{lead.formName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {lead.email || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {lead.phone || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.pipeline_stage && (
                          <Badge
                            variant="outline"
                            className={
                              lead.pipeline_stage === 'captado' ? 'border-slate-300 text-slate-700 bg-slate-50' :
                              lead.pipeline_stage === 'qualificado' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                              lead.pipeline_stage === 'handoff' ? 'border-purple-300 text-purple-700 bg-purple-50' :
                              lead.pipeline_stage === 'fechado' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                              'border-red-300 text-red-700 bg-red-50'
                            }
                          >
                            {lead.pipeline_stage === 'captado' ? 'Captado' :
                             lead.pipeline_stage === 'qualificado' ? 'Qualificado' :
                             lead.pipeline_stage === 'handoff' ? 'Handoff' :
                             lead.pipeline_stage === 'fechado' ? 'Fechado' :
                             'Descartado'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {lead.converted_client_id ? (
                            <>
                              <Link to={createPageUrl(`ClientDetail?id=${lead.converted_client_id}`)}>
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 cursor-pointer hover:bg-emerald-200 transition-colors">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Convertido
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Badge>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[#355340] hover:bg-[#355340]/10"
                                onClick={() => handleGenerateContract(lead)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Contrato
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-slate-400">
                              Pendente
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-500">
                          {lead.created_date ? format(new Date(lead.created_date), "dd/MM/yyyy HH:mm") : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(lead)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate(lead.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              {/* Pipeline View */}
              <LeadPipelineView 
                lead={selectedLead} 
                onUpdate={() => {
                  queryClient.invalidateQueries({ queryKey: ["leads"] });
                  setDialogOpen(false);
                }}
              />

              {selectedLead.pipeline_stage === 'captado' && (
                <Button 
                  onClick={() => setHandoffDialogOpen(true)}
                  className="w-full bg-[#355340] hover:bg-[#355340]/90"
                >
                  Realizar Handoff para Closer
                </Button>
              )}

              {selectedLead.pipeline_stage === 'qualificado' && (
                <>
                  <HandoffHistory leadId={selectedLead.id} />
                </>
              )}

              {/* Details Section */}
              <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Nome</p>
                  <p className="text-slate-900 mt-1">{selectedLead.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Email</p>
                  <p className="text-slate-900 mt-1">{selectedLead.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Telefone</p>
                  <p className="text-slate-900 mt-1">{selectedLead.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <p className="text-slate-900 mt-1">
                    {selectedLead.status === 'novo' ? 'Novo' :
                     selectedLead.status === 'em_contato' ? 'Em Contato' :
                     selectedLead.status === 'qualificado' ? 'Qualificado' :
                     selectedLead.status === 'descartado' ? 'Descartado' : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Origem</p>
                  <p className="text-slate-900 mt-1">{selectedLead.source || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Formulário</p>
                  <p className="text-slate-900 mt-1">{selectedLead.formName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Data de Cadastro</p>
                  <p className="text-slate-900 mt-1">
                    {selectedLead.created_date ? format(new Date(selectedLead.created_date), "dd/MM/yyyy 'às' HH:mm") : "-"}
                  </p>
                </div>
                {selectedLead.converted_client_id && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Cliente Criado</p>
                    <Link to={createPageUrl(`ClientDetail?id=${selectedLead.converted_client_id}`)}>
                      <p className="text-emerald-600 mt-1 flex items-center gap-1 hover:underline">
                        Ver Cliente
                        <ExternalLink className="h-3 w-3" />
                      </p>
                    </Link>
                  </div>
                )}
              </div>

              {selectedLead.message && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Mensagem</p>
                  <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700">
                    {selectedLead.message}
                  </div>
                </div>
              )}

              {selectedLead.rawPayload && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Dados Completos (JSON)</p>
                  <div className="bg-slate-50 rounded-lg p-4 text-xs font-mono max-h-64 overflow-y-auto">
                    <pre>{JSON.stringify(selectedLead.rawPayload, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Qualification Data */}
              {selectedLead.qualification_fit && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Dados de Qualificação</p>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                    <p><strong>Fit:</strong> {selectedLead.qualification_fit}</p>
                    {selectedLead.qualification_company_size && (
                      <p><strong>Tamanho da Empresa:</strong> {selectedLead.qualification_company_size}</p>
                    )}
                    {selectedLead.qualification_need && (
                      <p><strong>Necessidade:</strong> {selectedLead.qualification_need}</p>
                    )}
                    {selectedLead.qualification_notes && (
                      <p><strong>Notas:</strong> {selectedLead.qualification_notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Handoff Data */}
              {selectedLead.handoff_notes && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Handoff</p>
                  <div className="bg-purple-50 rounded-lg p-4 text-sm">
                    {selectedLead.handoff_from_name && (
                      <p className="mb-2"><strong>De:</strong> {selectedLead.handoff_from_name}</p>
                    )}
                    <p><strong>Observações:</strong> {selectedLead.handoff_notes}</p>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Lead Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Lead Manualmente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Nome do Contato <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Nome do lead"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Empresa
                </label>
                <Input
                  placeholder="Nome da empresa"
                  value={newLead.company}
                  onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Telefone
                </label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Segmento
                </label>
                <Input
                  placeholder="Ex: E-commerce de Moda"
                  value={newLead.segment}
                  onChange={(e) => setNewLead({ ...newLead, segment: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Mensagem
              </label>
              <Textarea
                placeholder="Observações ou mensagem do lead..."
                value={newLead.message}
                onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateLead}
              disabled={createLeadMutation.isPending}
              className="bg-[#355340] hover:bg-[#355340]/90"
            >
              {createLeadMutation.isPending ? "Criando..." : "Criar Lead"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedClient && (
       <GenerateContractWizard
         open={generateDialogOpen}
         onOpenChange={(open) => {
           setGenerateDialogOpen(open);
           if (!open) setSelectedClient(null);
         }}
         client={selectedClient}
       />
      )}

      {selectedLead && (
       <HandoffDialog 
         open={handoffDialogOpen}
         onOpenChange={(open) => {
           setHandoffDialogOpen(open);
           if (!open) {
             setDialogOpen(false);
             setSelectedLead(null);
           }
         }}
         lead={selectedLead}
       />
      )}
      </div>
      </>
      );
      }