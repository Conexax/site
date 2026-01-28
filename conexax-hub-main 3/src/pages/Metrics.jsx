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
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Target,
  MoreVertical,
  Pencil,
  Trash2,
  Building2,
  Download
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import StatsCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AuditPageView } from "@/components/audit/AuditLogger";
import { toast } from "sonner";

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

const prepareMetricDataForExport = (metrics, clients) => {
  return metrics.map(metric => {
    const client = clients.find(c => c.id === metric.client_id);
    return {
      "Cliente": client?.company_name || "",
      "Período": metric.period || "",
      "Receita Mensal": metric.monthly_revenue || "",
      "Crescimento (%)": metric.growth_percentage || "",
      "Investimento em Tráfego": metric.traffic_investment || "",
      "ROI": metric.roi || "",
      "Número de Pedidos": metric.orders_count || "",
      "Ticket Médio": metric.average_ticket || "",
    };
  });
};

export default function Metrics() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedClientId = urlParams.get("client_id");
  
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState(preselectedClientId || "all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [formData, setFormData] = useState({
    client_id: preselectedClientId || "",
    period: format(new Date(), "yyyy-MM"),
    monthly_revenue: "",
    growth_percentage: "",
    traffic_investment: "",
    roi: "",
    orders_count: "",
    average_ticket: ""
  });

  const queryClient = useQueryClient();

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: () => base44.entities.Metric.list("-period", 500),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: asaasCharges = [] } = useQuery({
    queryKey: ["asaasCharges"],
    queryFn: () => base44.entities.AsaasCharge.list("-created_date", 1000),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Metric.create({
      ...data,
      monthly_revenue: data.monthly_revenue ? parseFloat(data.monthly_revenue) : null,
      growth_percentage: data.growth_percentage ? parseFloat(data.growth_percentage) : null,
      traffic_investment: data.traffic_investment ? parseFloat(data.traffic_investment) : null,
      roi: data.roi ? parseFloat(data.roi) : null,
      orders_count: data.orders_count ? parseInt(data.orders_count) : null,
      average_ticket: data.average_ticket ? parseFloat(data.average_ticket) : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      toast.success("Métrica criada com sucesso!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao criar métrica: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Metric.update(id, {
      ...data,
      monthly_revenue: data.monthly_revenue ? parseFloat(data.monthly_revenue) : null,
      growth_percentage: data.growth_percentage ? parseFloat(data.growth_percentage) : null,
      traffic_investment: data.traffic_investment ? parseFloat(data.traffic_investment) : null,
      roi: data.roi ? parseFloat(data.roi) : null,
      orders_count: data.orders_count ? parseInt(data.orders_count) : null,
      average_ticket: data.average_ticket ? parseFloat(data.average_ticket) : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      toast.success("Métrica atualizada com sucesso!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar métrica: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Metric.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      toast.success("Métrica excluída com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir métrica: ${error.message}`);
    }
  });

  const handleOpenDialog = (metric = null) => {
    if (metric) {
      setEditingMetric(metric);
      setFormData({
        client_id: metric.client_id || "",
        period: metric.period || "",
        monthly_revenue: metric.monthly_revenue?.toString() || "",
        growth_percentage: metric.growth_percentage?.toString() || "",
        traffic_investment: metric.traffic_investment?.toString() || "",
        roi: metric.roi?.toString() || "",
        orders_count: metric.orders_count?.toString() || "",
        average_ticket: metric.average_ticket?.toString() || ""
      });
    } else {
      setEditingMetric(null);
      setFormData({
        client_id: clientFilter !== "all" ? clientFilter : "",
        period: format(new Date(), "yyyy-MM"),
        monthly_revenue: "",
        growth_percentage: "",
        traffic_investment: "",
        roi: "",
        orders_count: "",
        average_ticket: ""
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMetric(null);
  };

  const handleSubmit = () => {
    if (editingMetric) {
      updateMutation.mutate({ id: editingMetric.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredMetrics = metrics.filter((metric) => {
    const matchesClient = clientFilter === "all" || metric.client_id === clientFilter;
    return matchesClient;
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || "-";
  };

  const totalRevenue = filteredMetrics.reduce((sum, m) => sum + (m.monthly_revenue || 0), 0);
  const avgROI = filteredMetrics.length > 0 
    ? filteredMetrics.reduce((sum, m) => sum + (m.roi || 0), 0) / filteredMetrics.filter(m => m.roi).length 
    : 0;
  const totalOrders = filteredMetrics.reduce((sum, m) => sum + (m.orders_count || 0), 0);
  const avgTicket = filteredMetrics.length > 0 
    ? filteredMetrics.reduce((sum, m) => sum + (m.average_ticket || 0), 0) / filteredMetrics.filter(m => m.average_ticket).length 
    : 0;

  const chartData = filteredMetrics
    .slice(0, 12)
    .reverse()
    .map(m => ({
      period: m.period,
      revenue: m.monthly_revenue || 0,
      roi: m.roi || 0
    }));

  // Asaas metrics
  const asaasReceived = asaasCharges
    .filter(c => c.status === "RECEIVED" || c.status === "CONFIRMED" || c.status === "RECEIVED_IN_CASH")
    .reduce((sum, c) => sum + c.amount, 0);
  
  const asaasPending = asaasCharges
    .filter(c => c.status === "PENDING")
    .reduce((sum, c) => sum + c.amount, 0);
  
  const asaasOverdue = asaasCharges
    .filter(c => c.status === "OVERDUE")
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <>
      <AuditPageView pageName="Metrics" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Métricas</h1>
          <p className="text-slate-500 text-sm mt-1">Acompanhe o desempenho dos clientes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              const data = prepareMetricDataForExport(filteredMetrics, clients);
              exportToCSV(data, `metricas_${new Date().toISOString().split('T')[0]}`);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-[#355340] hover:bg-[#355340]/90">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Métrica
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Receita Total" 
          value={`R$ ${totalRevenue.toLocaleString("pt-BR")}`} 
          icon={DollarSign} 
        />
        <StatsCard 
          title="ROI Médio" 
          value={`${avgROI.toFixed(1)}x`} 
          icon={Target} 
          iconClassName="bg-emerald-500" 
        />
        <StatsCard 
          title="Total de Pedidos" 
          value={totalOrders.toLocaleString("pt-BR")} 
          icon={ShoppingCart} 
          iconClassName="bg-blue-500" 
        />
        <StatsCard 
          title="Ticket Médio" 
          value={`R$ ${avgTicket.toFixed(2)}`} 
          icon={TrendingUp} 
          iconClassName="bg-amber-500" 
        />
      </div>

      {/* Asaas Section */}
      {asaasCharges.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Métricas Asaas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard 
              title="Recebido (Asaas)" 
              value={`R$ ${asaasReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} 
              icon={DollarSign} 
              iconClassName="bg-green-500" 
            />
            <StatsCard 
              title="Pendente (Asaas)" 
              value={`R$ ${asaasPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} 
              icon={DollarSign} 
              iconClassName="bg-blue-500" 
            />
            <StatsCard 
              title="Vencido (Asaas)" 
              value={`R$ ${asaasOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} 
              icon={DollarSign} 
              iconClassName="bg-red-500" 
            />
          </div>
        </>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução da Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    formatter={(value) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#355340" 
                    strokeWidth={2} 
                    dot={{ fill: "#355340" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredMetrics.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Nenhuma métrica encontrada"
              description="Adicione métricas para acompanhar o desempenho"
              actionLabel="Nova Métrica"
              onAction={() => handleOpenDialog()}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>Crescimento</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{getClientName(metric.client_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{metric.period}</TableCell>
                      <TableCell>
                        <span className="font-medium">
                          R$ {metric.monthly_revenue?.toLocaleString("pt-BR") || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={metric.growth_percentage >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {metric.growth_percentage ? `${metric.growth_percentage > 0 ? "+" : ""}${metric.growth_percentage}%` : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {metric.roi ? `${metric.roi}x` : "-"}
                      </TableCell>
                      <TableCell>
                        {metric.orders_count?.toLocaleString("pt-BR") || "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(metric)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => deleteMutation.mutate(metric.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMetric ? "Editar Métrica" : "Nova Métrica"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>Período *</Label>
                <Input
                  type="month"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Receita Mensal (R$)</Label>
                <Input
                  type="number"
                  value={formData.monthly_revenue}
                  onChange={(e) => setFormData({ ...formData, monthly_revenue: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Crescimento (%)</Label>
                <Input
                  type="number"
                  value={formData.growth_percentage}
                  onChange={(e) => setFormData({ ...formData, growth_percentage: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Investimento em Tráfego (R$)</Label>
                <Input
                  type="number"
                  value={formData.traffic_investment}
                  onChange={(e) => setFormData({ ...formData, traffic_investment: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>ROI</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.roi}
                  onChange={(e) => setFormData({ ...formData, roi: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número de Pedidos</Label>
                <Input
                  type="number"
                  value={formData.orders_count}
                  onChange={(e) => setFormData({ ...formData, orders_count: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Ticket Médio (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.average_ticket}
                  onChange={(e) => setFormData({ ...formData, average_ticket: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={!formData.client_id || !formData.period}
            >
              {editingMetric ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}