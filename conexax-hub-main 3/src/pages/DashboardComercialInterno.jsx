import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  TrendingUp,
  Target,
  DollarSign,
  Receipt,
  CreditCard,
  Filter,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/ui/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return format(new Date(dateString), "dd/MM/yyyy");
};

export default function DashboardComercialInterno() {
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: sellers = [], isLoading: loadingSellers } = useQuery({
    queryKey: ["commercialTeam"],
    queryFn: () => base44.entities.CommercialTeamMember.list(),
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-start_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list(),
  });

  const { data: commissionPayments = [] } = useQuery({
    queryKey: ["commissionPayments"],
    queryFn: () => base44.entities.CommissionPayment.list(),
  });

  const getDateRange = () => {
    const today = new Date();
    if (selectedPeriod === "7days") return { start: subDays(today, 7), end: today };
    if (selectedPeriod === "30days") return { start: subDays(today, 30), end: today };
    if (selectedPeriod === "90days") return { start: subDays(today, 90), end: today };
    if (selectedPeriod === "currentMonth") return { start: startOfMonth(today), end: endOfMonth(today) };
    return { start: subDays(today, 30), end: today };
  };

  const filteredData = useMemo(() => {
    const { start, end } = getDateRange();
    
    let filtered = contracts.filter(contract => {
      const contractDate = contract.start_date ? new Date(contract.start_date) : null;
      if (!contractDate || contractDate < start || contractDate > end) return false;
      
      if (selectedSeller !== "all" && contract.seller_id !== selectedSeller) return false;
      if (selectedStatus !== "all" && contract.status !== selectedStatus) return false;
      
      return true;
    });

    if (selectedPlan !== "all") {
      filtered = filtered.filter(c => {
        const client = clients.find(cl => cl.id === c.client_id);
        return client?.plan === selectedPlan;
      });
    }

    return filtered;
  }, [contracts, selectedSeller, selectedPeriod, selectedPlan, selectedStatus, clients]);

  const metrics = useMemo(() => {
    let totalMRR = 0;
    let totalCommissionExpected = 0;
    let contractCount = 0;

    filteredData.forEach(contract => {
      const client = clients.find(c => c.id === contract.client_id);
      const seller = sellers.find(s => s.id === contract.seller_id);
      
      let mrr = contract.monthly_value || 0;
      
      if (client?.plan_duration === "anual") {
        mrr = (contract.monthly_value * 12) / 12;
      } else if (client?.plan_duration === "semestral") {
        mrr = (contract.monthly_value * 6) / 12;
      } else if (client?.plan_duration === "trimestral") {
        mrr = (contract.monthly_value * 3) / 12;
      }

      if (contract.status === "active" || contract.status === "negotiation") {
        totalMRR += mrr;
        contractCount++;
        
        const commissionRate = seller?.commission_percentage || 0;
        totalCommissionExpected += (mrr * commissionRate) / 100;
      }
    });

    const sellerData = selectedSeller !== "all" ? sellers.find(s => s.id === selectedSeller) : null;
    const monthlyGoal = sellerData?.monthly_goal || 0;
    const goalPercentage = monthlyGoal > 0 ? (totalMRR / monthlyGoal) * 100 : 0;

    const totalCommissionPaid = commissionPayments
      .filter(p => {
        if (selectedSeller !== "all" && p.seller_id !== selectedSeller) return false;
        if (p.status !== "paid") return false;
        
        const { start, end } = getDateRange();
        const paymentDate = p.payment_date ? new Date(p.payment_date) : null;
        return paymentDate && paymentDate >= start && paymentDate <= end;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const avgTicket = contractCount > 0 ? totalMRR / contractCount : 0;

    return {
      totalMRR,
      goalPercentage,
      totalCommissionExpected,
      totalCommissionPaid,
      avgTicket,
      contractCount
    };
  }, [filteredData, clients, sellers, selectedSeller, commissionPayments]);

  const chartData = useMemo(() => {
    const { start, end } = getDateRange();
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const data = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      
      const dayContracts = filteredData.filter(c => {
        const cDate = c.start_date ? new Date(c.start_date) : null;
        return cDate && 
               cDate.getFullYear() === date.getFullYear() &&
               cDate.getMonth() === date.getMonth() &&
               cDate.getDate() === date.getDate();
      });

      let dayMRR = 0;
      dayContracts.forEach(contract => {
        const client = clients.find(cl => cl.id === contract.client_id);
        let mrr = contract.monthly_value || 0;
        
        if (client?.plan_duration === "anual") {
          mrr = (contract.monthly_value * 12) / 12;
        } else if (client?.plan_duration === "semestral") {
          mrr = (contract.monthly_value * 6) / 12;
        } else if (client?.plan_duration === "trimestral") {
          mrr = (contract.monthly_value * 3) / 12;
        }

        if (contract.status === "active" || contract.status === "negotiation") {
          dayMRR += mrr;
        }
      });

      data.push({
        date: format(date, "dd/MMM", { locale: ptBR }),
        mrr: dayMRR
      });
    }

    return data;
  }, [filteredData, clients]);

  const tableData = useMemo(() => {
    return filteredData.map(contract => {
      const client = clients.find(c => c.id === contract.client_id);
      const seller = sellers.find(s => s.id === contract.seller_id);
      
      let mrr = contract.monthly_value || 0;
      if (client?.plan_duration === "anual") {
        mrr = (contract.monthly_value * 12) / 12;
      } else if (client?.plan_duration === "semestral") {
        mrr = (contract.monthly_value * 6) / 12;
      } else if (client?.plan_duration === "trimestral") {
        mrr = (contract.monthly_value * 3) / 12;
      }

      const commissionRate = seller?.commission_percentage || 0;
      const commissionExpected = (contract.status === "active" || contract.status === "negotiation") 
        ? (mrr * commissionRate) / 100 
        : 0;

      const commissionPaid = commissionPayments
        .filter(p => p.contract_id === contract.id && p.status === "paid")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        id: contract.id,
        clientName: client?.company_name || "Cliente não encontrado",
        plan: client?.plan || "-",
        value: mrr,
        closeDate: contract.start_date,
        status: contract.status,
        commissionExpected,
        commissionPaid
      };
    });
  }, [filteredData, clients, sellers, commissionPayments]);

  const handleExportCSV = () => {
    const headers = ["Conta", "Plano", "MRR", "Data", "Status", "Comissão Prevista", "Comissão Paga"];
    const rows = tableData.map(row => [
      row.clientName,
      row.plan,
      formatCurrency(row.value),
      formatDate(row.closeDate),
      row.status,
      formatCurrency(row.commissionExpected),
      formatCurrency(row.commissionPaid)
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-comercial-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canViewAllSellers = user?.role === "admin" || user?.role === "financeiro";

  if (!user) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!canViewAllSellers && selectedSeller === "all") {
    const mySellerId = sellers.find(s => s.user_id === user.id)?.id;
    if (mySellerId) {
      setSelectedSeller(mySellerId);
    }
  }

  const isLoading = loadingSellers || loadingContracts;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Comercial Interno</h1>
          <p className="text-slate-500 text-sm mt-1">Performance e comissões por vendedor</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Vendedor</label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {canViewAllSellers && <SelectItem value="all">Todos</SelectItem>}
                  {sellers.filter(s => s.status === "active").map(seller => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="currentMonth">Mês atual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Plano</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {plans.filter(p => p.is_active).map(plan => (
                    <SelectItem key={plan.id} value={plan.name}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="negotiation">Negociação</SelectItem>
                  <SelectItem value="ended">Finalizado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="MRR Vendido"
            value={formatCurrency(metrics.totalMRR)}
            subtitle={`${metrics.contractCount} contratos`}
            icon={TrendingUp}
            iconClassName="bg-[#355340]"
          />
          <StatsCard
            title="Meta Atingida"
            value={`${metrics.goalPercentage.toFixed(1)}%`}
            subtitle={selectedSeller !== "all" ? `Meta: ${formatCurrency(sellers.find(s => s.id === selectedSeller)?.monthly_goal || 0)}` : "-"}
            icon={Target}
            iconClassName={metrics.goalPercentage >= 100 ? "bg-emerald-500" : "bg-amber-500"}
          />
          <StatsCard
            title="Comissão Prevista"
            value={formatCurrency(metrics.totalCommissionExpected)}
            subtitle="Baseado em contratos ativos"
            icon={DollarSign}
            iconClassName="bg-blue-500"
          />
          <StatsCard
            title="Comissão Paga"
            value={formatCurrency(metrics.totalCommissionPaid)}
            subtitle="Pagamentos confirmados"
            icon={CreditCard}
            iconClassName="bg-emerald-500"
          />
          <StatsCard
            title="Ticket Médio"
            value={formatCurrency(metrics.avgTicket)}
            subtitle="Por contrato"
            icon={Receipt}
            iconClassName="bg-purple-500"
          />
        </div>
      )}

      {/* Chart */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Evolução de MRR Vendido</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-80" />
          ) : chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-slate-400">
              Sem dados para o período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mrr" 
                  stroke="#355340" 
                  strokeWidth={2}
                  dot={{ fill: '#355340', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Contratos do Período</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : tableData.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              Nenhum contrato no período selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Conta</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Plano</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">MRR</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600">Data</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">Comissão Prevista</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">Comissão Paga</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">{row.clientName}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{row.plan}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                        {formatCurrency(row.value)}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-slate-600">
                        {formatDate(row.closeDate)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className={
                          row.status === 'active' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                          row.status === 'negotiation' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                          row.status === 'ended' ? 'border-slate-200 text-slate-700 bg-slate-50' :
                          'border-red-200 text-red-700 bg-red-50'
                        }>
                          {row.status === 'active' ? 'Ativo' :
                           row.status === 'negotiation' ? 'Negociação' :
                           row.status === 'ended' ? 'Finalizado' : 'Cancelado'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-blue-600">
                        {formatCurrency(row.commissionExpected)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-emerald-600">
                        {formatCurrency(row.commissionPaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}