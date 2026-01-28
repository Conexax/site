import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatDate = (date) => {
  if (!date) return "";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  ExternalLink,
  Building2,
  Download,
  Printer,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/ui/StatusBadge";
import StatsCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import CommentSection from "@/components/collaboration/CommentSection";
import FileAttachments from "@/components/collaboration/FileAttachments";
import { AuditPageView, useAuditLog } from "@/components/audit/AuditLogger";
import { toast } from "sonner";
import AdvancedSearch from "@/components/search/AdvancedSearch";
import SortableHeader from "@/components/search/SortableHeader";
import ContractStatusManager from "@/components/contracts/ContractStatusManager";
import ContractAuditTrail from "@/components/contracts/ContractAuditTrail";
import CustomFieldsManager from "@/components/contracts/CustomFieldsManager";
import SendForSignatureDialog from "@/components/contracts/SendForSignatureDialog";
import GenerateFromTemplateDialog from "@/components/contracts/GenerateFromTemplateDialog";

const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [headers.join(","), ...data.map(row => headers.map(header => {
    const value = row[header];
    if (value === null || value === undefined) return "";
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  }).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const prepareContractDataForExport = (contracts, clients) => {
  return contracts.map(contract => {
    const client = clients.find(c => c.id === contract.client_id);
    return {
      "Cliente": client?.company_name || "",
      "Número do Contrato": contract.contract_number || "",
      "Valor Mensal": contract.monthly_value || "",
      "Percentual Variável": contract.variable_percentage || "",
      "Data de Início": contract.start_date || "",
      "Vigência (meses)": contract.validity_months || "",
      "Status": contract.status || "",
    };
  });
};

export default function Contracts() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedClientId = urlParams.get("client_id");
  const { logAction } = useAuditLog();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [savedFilters, setSavedFilters] = useState(() => {
    const saved = localStorage.getItem("contracts_filters");
    return saved ? JSON.parse(saved) : [];
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signingContract, setSigningContract] = useState(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: preselectedClientId || "",
    contract_number: "",
    monthly_value: "",
    variable_percentage: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    validity_months: "12",
    status: "draft",
    seller_id: "",
    notes: "",
    custom_fields: {}
  });

  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date", 500),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: commercialTeam = [] } = useQuery({
    queryKey: ["commercialTeam"],
    queryFn: () => base44.entities.CommercialTeamMember.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.create({
      ...data,
      monthly_value: data.monthly_value ? parseFloat(data.monthly_value) : null,
      variable_percentage: data.variable_percentage ? parseFloat(data.variable_percentage) : null,
      validity_months: data.validity_months ? parseInt(data.validity_months) : null
    }),
    onSuccess: async (contract) => {
      await logAction({
        action: 'CREATE_CONTRACT',
        entityType: 'Contract',
        entityId: contract.id,
        entityName: contract.contract_number || contract.id.slice(0, 8),
        afterSnapshot: contract
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato criado com sucesso!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao criar contrato: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, beforeContract }) => {
      const updated = await base44.entities.Contract.update(id, {
        ...data,
        monthly_value: data.monthly_value ? parseFloat(data.monthly_value) : null,
        variable_percentage: data.variable_percentage ? parseFloat(data.variable_percentage) : null,
        validity_months: data.validity_months ? parseInt(data.validity_months) : null
      });
      return { updated, beforeContract };
    },
    onSuccess: async ({ updated, beforeContract }) => {
      await logAction({
        action: 'UPDATE_CONTRACT',
        entityType: 'Contract',
        entityId: updated.id,
        entityName: updated.contract_number || updated.id.slice(0, 8),
        beforeSnapshot: beforeContract,
        afterSnapshot: updated
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato atualizado com sucesso!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar contrato: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contract.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir contrato: ${error.message}`);
    }
  });

  const handleOpenDialog = (contract = null) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        client_id: contract.client_id || "",
        contract_number: contract.contract_number || "",
        monthly_value: contract.monthly_value?.toString() || "",
        variable_percentage: contract.variable_percentage?.toString() || "",
        start_date: contract.start_date || "",
        end_date: contract.end_date || "",
        validity_months: contract.validity_months?.toString() || "12",
        status: contract.status || "draft",
        seller_id: contract.seller_id || "",
        notes: contract.notes || "",
        custom_fields: contract.custom_fields || {}
      });
    } else {
      setEditingContract(null);
      setFormData({
        client_id: preselectedClientId || "",
        contract_number: "",
        monthly_value: "",
        variable_percentage: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: "",
        validity_months: "12",
        status: "draft",
        seller_id: "",
        notes: ""
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingContract(null);
  };

  const handleSubmit = () => {
    if (editingContract) {
      // Verificar se contrato pode ser editado
      if (editingContract.status === 'signed' || editingContract.status === 'cancelled') {
        toast.error("Contratos assinados ou cancelados não podem ser editados");
        return;
      }
      updateMutation.mutate({ 
        id: editingContract.id, 
        data: formData,
        beforeContract: editingContract 
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFileUpload = async (contractId, file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Contract.update(contractId, { signed_file_url: file_url });
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
  };

  const handlePrintContract = (contract) => {
    const client = clients.find(c => c.id === contract.client_id);
    const seller = commercialTeam.find(s => s.id === contract.seller_id);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Contrato ${contract.contract_number || contract.id.slice(0, 8)}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { 
              color: #355340; 
              margin-bottom: 10px; 
              text-align: center;
            }
            .header { 
              border-bottom: 2px solid #355340; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
              text-align: center;
            }
            .section { 
              margin-bottom: 25px;
              padding: 15px;
              background: #f8f9fa;
              border-left: 4px solid #62997f;
            }
            .section-title {
              font-weight: bold;
              color: #355340;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              padding: 5px 0;
            }
            .info-label {
              font-weight: 600;
              color: #666;
            }
            .info-value {
              color: #333;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
            <p style="margin: 5px 0;">Contrato #${contract.contract_number || contract.id.slice(0, 8)}</p>
          </div>

          <div class="section">
            <div class="section-title">DADOS DO CLIENTE</div>
            <div class="info-row">
              <span class="info-label">Razão Social:</span>
              <span class="info-value">${client?.company_name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">CNPJ:</span>
              <span class="info-value">${client?.cnpj || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Responsável:</span>
              <span class="info-value">${client?.responsible_name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">E-mail:</span>
              <span class="info-value">${client?.email || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Telefone:</span>
              <span class="info-value">${client?.phone || '-'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">VALORES E CONDIÇÕES</div>
            <div class="info-row">
              <span class="info-label">Valor Mensal:</span>
              <span class="info-value">R$ ${contract.monthly_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
            </div>
            ${contract.variable_percentage > 0 ? `
              <div class="info-row">
                <span class="info-label">Percentual Variável:</span>
                <span class="info-value">${contract.variable_percentage}%</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Vigência:</span>
              <span class="info-value">${contract.validity_months || 12} meses</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data de Início:</span>
              <span class="info-value">${contract.start_date ? formatDate(contract.start_date) : '-'}</span>
            </div>
            ${contract.end_date ? `
              <div class="info-row">
                <span class="info-label">Data de Término:</span>
                <span class="info-value">${formatDate(contract.end_date)}</span>
              </div>
            ` : ''}
          </div>

          ${seller ? `
            <div class="section">
              <div class="section-title">VENDEDOR RESPONSÁVEL</div>
              <div class="info-row">
                <span class="info-label">Nome:</span>
                <span class="info-value">${seller.name}</span>
              </div>
            </div>
          ` : ''}

          ${contract.notes ? `
            <div class="section">
              <div class="section-title">OBSERVAÇÕES</div>
              <p style="margin: 10px 0; color: #333;">${contract.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Documento gerado automaticamente pelo sistema ConexaX</p>
            <p>Data de impressão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSaveFilter = (filter) => {
    const newFilters = [...savedFilters, filter];
    setSavedFilters(newFilters);
    localStorage.setItem("contracts_filters", JSON.stringify(newFilters));
    toast.success("Filtro salvo com sucesso");
  };

  const handleDeleteFilter = (index) => {
    const newFilters = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newFilters);
    localStorage.setItem("contracts_filters", JSON.stringify(newFilters));
  };

  const advancedSearchFields = [
    { key: "contract_number", label: "Número", type: "text", placeholder: "Número do contrato..." },
    { key: "client_name", label: "Cliente", type: "text", placeholder: "Nome do cliente..." },
    { key: "start_date", label: "Data Início", type: "date" },
    { key: "end_date", label: "Data Fim", type: "date" }
  ];

  const filteredContracts = contracts
    .filter((contract) => {
      const client = clients.find(c => c.id === contract.client_id);
      const matchesSearch = 
        client?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        contract.contract_number?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;

      // Filtros avançados
      if (advancedFilters.contract_number && !contract.contract_number?.toLowerCase().includes(advancedFilters.contract_number.toLowerCase())) {
        return false;
      }
      if (advancedFilters.client_name && !client?.company_name?.toLowerCase().includes(advancedFilters.client_name.toLowerCase())) {
        return false;
      }
      if (advancedFilters.start_date && contract.start_date !== advancedFilters.start_date) {
        return false;
      }
      if (advancedFilters.end_date && contract.end_date !== advancedFilters.end_date) {
        return false;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "client_name") {
        const clientA = clients.find(c => c.id === a.client_id);
        const clientB = clients.find(c => c.id === b.client_id);
        aVal = clientA?.company_name?.toLowerCase() || "";
        bVal = clientB?.company_name?.toLowerCase() || "";
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || "";
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || "-";
  };

  const getSellerName = (sellerId) => {
    const seller = commercialTeam.find(s => s.id === sellerId);
    return seller?.name || "-";
  };

  const signedContracts = contracts.filter(c => c.status === "signed").length;
  const draftContracts = contracts.filter(c => c.status === "draft").length;
  const totalMonthlyRevenue = contracts
    .filter(c => c.status === "signed")
    .reduce((sum, c) => sum + (c.monthly_value || 0), 0);

  return (
    <>
      <AuditPageView pageName="Contracts" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contratos</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie contratos e acordos comerciais</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              const data = prepareContractDataForExport(filteredContracts, clients);
              exportToCSV(data, `contratos_${new Date().toISOString().split('T')[0]}`);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button 
            variant="outline"
            onClick={() => setGenerateDialogOpen(true)} 
            className="border-[#355340] text-[#355340] hover:bg-[#355340]/10"
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar de Modelo
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-[#355340] hover:bg-[#355340]/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total de Contratos" value={contracts.length} icon={FileText} />
        <StatsCard title="Contratos Assinados" value={signedContracts} icon={FileText} iconClassName="bg-emerald-500" />
        <StatsCard title="Rascunhos" value={draftContracts} icon={FileText} iconClassName="bg-amber-500" />
        <StatsCard 
          title="Receita Mensal" 
          value={`R$ ${totalMonthlyRevenue.toLocaleString("pt-BR")}`} 
          icon={DollarSign} 
          iconClassName="bg-blue-500" 
        />
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Busca rápida..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="signed">Assinado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
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

      {/* Contracts List */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum contrato encontrado"
              description="Crie um novo contrato para começar"
              actionLabel="Novo Contrato"
              onAction={() => handleOpenDialog()}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredContracts.map((contract) => (
                <div key={contract.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer" 
                      onClick={() => {
                        setViewingContract(contract);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#62997f]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-[#355340]" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">
                            {getClientName(contract.client_id)}
                          </h3>
                          <p className="text-sm text-slate-500">
                            Contrato #{contract.contract_number || contract.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <StatusBadge status={contract.status} />
                        <div className="flex items-center gap-1 text-slate-600">
                          <DollarSign className="h-4 w-4" />
                          R$ {contract.monthly_value?.toLocaleString("pt-BR") || "0"} /mês
                        </div>
                        {contract.variable_percentage > 0 && (
                          <span className="text-slate-500">
                            + {contract.variable_percentage}% variável
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-slate-500">
                          <Calendar className="h-4 w-4" />
                          {contract.start_date ? formatDate(contract.start_date) : "-"}
                        </div>
                        {contract.signed_file_url && (
                          <a 
                            href={contract.signed_file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#355340] hover:text-[#355340]/80 flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Ver contrato
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ContractStatusManager contract={contract} compact={true} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(contract.status === 'draft' || contract.status === 'sent') && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSigningContract(contract);
                                setSignatureDialogOpen(true);
                              }}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar para Assinatura
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handlePrintContract(contract)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(contract)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <label className="cursor-pointer">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Assinado
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(contract.id, file);
                                }}
                              />
                            </label>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Tem certeza que deseja excluir este contrato?')) {
                                deleteMutation.mutate(contract.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContract ? "Editar Contrato" : "Novo Contrato"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Cliente *</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                >
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
              <div>
                <Label>Número do Contrato</Label>
                <Input
                  value={formData.contract_number}
                  onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                  placeholder="Ex: CX-2024-001"
                />
              </div>
              <div>
                <Label>Vendedor</Label>
                <Select 
                  value={formData.seller_id} 
                  onValueChange={(v) => setFormData({ ...formData, seller_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {commercialTeam.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Mensal (R$) *</Label>
                <Input
                  type="number"
                  value={formData.monthly_value}
                  onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Percentual Variável (%)</Label>
                <Input
                  type="number"
                  value={formData.variable_percentage}
                  onChange={(e) => setFormData({ ...formData, variable_percentage: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Vigência (meses)</Label>
                <Input
                  type="number"
                  value={formData.validity_months}
                  onChange={(e) => setFormData({ ...formData, validity_months: e.target.value })}
                  placeholder="12"
                />
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
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="signed">Assinado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais..."
                rows={3}
              />
            </div>
            
            <CustomFieldsManager
              customFields={formData.custom_fields}
              onChange={(fields) => setFormData({ ...formData, custom_fields: fields })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={!formData.client_id || !formData.monthly_value}
            >
              {editingContract ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
          </DialogHeader>
          {viewingContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Cliente</p>
                  <p className="text-slate-800 font-medium mt-1">{getClientName(viewingContract.client_id)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Número do Contrato</p>
                  <p className="text-slate-800 mt-1">{viewingContract.contract_number || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Valor Mensal</p>
                  <p className="text-slate-800 font-semibold mt-1">R$ {viewingContract.monthly_value?.toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Percentual Variável</p>
                  <p className="text-slate-800 mt-1">{viewingContract.variable_percentage}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Data de Início</p>
                  <p className="text-slate-800 mt-1">
                    {viewingContract.start_date ? formatDate(viewingContract.start_date) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <div className="mt-1">
                    <ContractStatusManager contract={viewingContract} compact={false} />
                  </div>
                </div>
              </div>
              
              {viewingContract.notes && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Observações</p>
                  <p className="text-slate-700 mt-1">{viewingContract.notes}</p>
                </div>
              )}

              <ContractAuditTrail contract={viewingContract} />
              <FileAttachments entityType="contract" entityId={viewingContract.id} />
              <CommentSection entityType="contract" entityId={viewingContract.id} />
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => handlePrintContract(viewingContract)}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setDetailsDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send for Signature Dialog */}
      <SendForSignatureDialog
        contract={signingContract}
        client={signingContract ? clients.find(c => c.id === signingContract.client_id) : null}
        open={signatureDialogOpen}
        onOpenChange={(open) => {
          setSignatureDialogOpen(open);
          if (!open) setSigningContract(null);
        }}
      />

      {/* Generate from Template Dialog */}
      <GenerateFromTemplateDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onSuccess={(contract) => {
          setViewingContract(contract);
          setDetailsDialogOpen(true);
        }}
      />
    </div>
    </>
  );
}