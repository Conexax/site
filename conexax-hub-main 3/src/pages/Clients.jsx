import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AuditPageView } from "@/components/audit/AuditLogger";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatDate = (date) => {
  if (!date) return "";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};
import {
  Search,
  Building2,
  Plus,
  Filter,
  Eye,
  MoreVertical,
  ChevronRight,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/ui/StatusBadge";
import StatsCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import ChurnIndicator from "@/components/clients/ChurnIndicator";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import AdvancedSearch from "@/components/search/AdvancedSearch";
import SortableHeader from "@/components/search/SortableHeader";

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

const prepareClientDataForExport = (clients) => {
  return clients.map(client => ({
    "Empresa": client.company_name || "",
    "CNPJ": client.cnpj || "",
    "Responsável": client.responsible_name || "",
    "Email": client.email || "",
    "Telefone": client.phone || "",
    "Segmento": client.segment || "",
    "Faturamento Médio": client.average_revenue || "",
    "Plano": client.plan || "",
    "Status": client.status || "",
    "Data de Início": client.start_date || "",
  }));
};

export default function Clients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [savedFilters, setSavedFilters] = useState(() => {
    const saved = localStorage.getItem("clients_filters");
    return saved ? JSON.parse(saved) : [];
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [recalculating, setRecalculating] = useState(false);

  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 500),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const handleRecalculateChurn = async () => {
    setRecalculating(true);
    try {
      await base44.functions.invoke('recalculateAllChurnScores', {});
      await queryClient.invalidateQueries(['clients']);
      toast.success("Scores de churn recalculados");
    } catch (error) {
      toast.error("Erro ao recalcular scores");
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveFilter = (filter) => {
    const newFilters = [...savedFilters, filter];
    setSavedFilters(newFilters);
    localStorage.setItem("clients_filters", JSON.stringify(newFilters));
    toast.success("Filtro salvo com sucesso");
  };

  const handleDeleteFilter = (index) => {
    const newFilters = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newFilters);
    localStorage.setItem("clients_filters", JSON.stringify(newFilters));
  };

  const advancedSearchFields = [
    { key: "company_name", label: "Empresa", type: "text", placeholder: "Nome da empresa..." },
    { key: "responsible_name", label: "Responsável", type: "text", placeholder: "Nome do responsável..." },
    { key: "segment", label: "Segmento", type: "text", placeholder: "Segmento..." },
    { key: "cnpj", label: "CNPJ", type: "text", placeholder: "CNPJ..." },
    { 
      key: "churn_status", 
      label: "Risco Churn", 
      type: "select",
      options: [
        { value: "healthy", label: "Saudável" },
        { value: "attention", label: "Atenção" },
        { value: "risk", label: "Risco" }
      ]
    }
  ];

  const filteredClients = clients
    .filter((client) => {
      const matchesSearch = 
        client.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        client.responsible_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const matchesPlan = planFilter === "all" || client.plan === planFilter;

      // Filtros avançados
      if (advancedFilters.company_name && !client.company_name?.toLowerCase().includes(advancedFilters.company_name.toLowerCase())) {
        return false;
      }
      if (advancedFilters.responsible_name && !client.responsible_name?.toLowerCase().includes(advancedFilters.responsible_name.toLowerCase())) {
        return false;
      }
      if (advancedFilters.segment && !client.segment?.toLowerCase().includes(advancedFilters.segment.toLowerCase())) {
        return false;
      }
      if (advancedFilters.cnpj && !client.cnpj?.includes(advancedFilters.cnpj)) {
        return false;
      }
      if (advancedFilters.churn_status && client.churn_status !== advancedFilters.churn_status) {
        return false;
      }

      return matchesSearch && matchesStatus && matchesPlan;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "churn_score") {
        aVal = a.churn_score || 0;
        bVal = b.churn_score || 0;
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || "";
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const activeCount = clients.filter(c => c.status === "active").length;
  const onboardingCount = clients.filter(c => c.status === "onboarding").length;
  const pausedCount = clients.filter(c => c.status === "paused").length;

  const getResponsibleName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || "-";
  };

  const planLabels = {
    starter: "Starter",
    growth: "Growth",
    scale: "Scale",
    enterprise: "Enterprise"
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie sua carteira de clientes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              const data = prepareClientDataForExport(filteredClients);
              exportToCSV(data, `clientes_${new Date().toISOString().split('T')[0]}`);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button 
            variant="outline"
            onClick={handleRecalculateChurn}
            disabled={recalculating}
            className="border-[#355340] text-[#355340] hover:bg-[#355340]/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
            Recalcular Churn
          </Button>
          <Link to={createPageUrl("ClientRegistration")}>
            <Button className="bg-[#355340] hover:bg-[#355340]/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total de Clientes" value={clients.length} icon={Building2} />
        <StatsCard title="Ativos" value={activeCount} icon={Building2} iconClassName="bg-emerald-500" />
        <StatsCard title="Onboarding" value={onboardingCount} icon={Building2} iconClassName="bg-blue-500" />
        <StatsCard title="Pausados" value={pausedCount} icon={Building2} iconClassName="bg-amber-500" />
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
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Planos</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
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

      {/* Clients Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhum cliente encontrado"
              description="Cadastre um novo cliente para começar"
              actionLabel="Novo Cliente"
              onAction={() => window.location.href = createPageUrl("ClientRegistration")}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortableHeader 
                        label="Empresa" 
                        sortKey="company_name"
                        currentSort={sortConfig}
                        onSort={setSortConfig}
                      />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Responsável</TableHead>
                    <TableHead className="hidden lg:table-cell">Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <SortableHeader 
                        label="Risco Churn" 
                        sortKey="churn_score"
                        currentSort={sortConfig}
                        onSort={setSortConfig}
                      />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <SortableHeader 
                        label="Data de Início" 
                        sortKey="start_date"
                        currentSort={sortConfig}
                        onSort={setSortConfig}
                      />
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell>
                        <Link to={createPageUrl(`ClientDetail?id=${client.id}`)} className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#62997f]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-[#355340] font-semibold text-sm">
                              {client.company_name?.charAt(0) || "C"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{client.company_name}</p>
                            <p className="text-xs text-slate-500">{client.segment || "Sem segmento"}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-slate-600">
                          {getResponsibleName(client.internal_responsible_id)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-slate-600">
                          {planLabels[client.plan] || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={client.status} />
                      </TableCell>
                      <TableCell>
                        <ChurnIndicator client={client} showDetails={true} size="sm" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-slate-500">
                          {client.start_date ? format(new Date(client.start_date), "dd/MM/yyyy") : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link to={createPageUrl(`ClientDetail?id=${client.id}`)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}