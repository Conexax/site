import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/ui/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditPageView } from "@/components/audit/AuditLogger";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import ContractMetricsDashboard from "@/components/contracts/ContractMetricsDashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

const COLORS = ['#355340', '#62997f', '#f59e0b', '#dc2626'];

export default function ContractsDashboard() {
  const [timeRange, setTimeRange] = useState("month");

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date", 500),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  if (loadingContracts) {
    return (
      <>
        <AuditPageView pageName="ContractsDashboard" />
        <div className="p-6 lg:p-8 space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </>
    );
  }

  // Métricas gerais
  const totalContracts = contracts.length;
  const signedContracts = contracts.filter(c => c.status === 'signed');
  const draftContracts = contracts.filter(c => c.status === 'draft');
  const sentContracts = contracts.filter(c => c.status === 'sent');
  const cancelledContracts = contracts.filter(c => c.status === 'cancelled');

  // Receita
  const totalMRR = signedContracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);
  const avgContractValue = signedContracts.length > 0 
    ? totalMRR / signedContracts.length 
    : 0;

  // Contratos próximos do vencimento
  const now = new Date();
  const expiringIn30Days = signedContracts.filter(c => {
    if (!c.end_date) return false;
    const endDate = new Date(c.end_date);
    const daysUntil = differenceInDays(endDate, now);
    return daysUntil > 0 && daysUntil <= 30;
  });

  const expiringIn60Days = signedContracts.filter(c => {
    if (!c.end_date) return false;
    const endDate = new Date(c.end_date);
    const daysUntil = differenceInDays(endDate, now);
    return daysUntil > 30 && daysUntil <= 60;
  });

  // Distribuição por status
  const statusDistribution = [
    { name: 'Rascunho', value: draftContracts.length, color: COLORS[0] },
    { name: 'Enviado', value: sentContracts.length, color: COLORS[1] },
    { name: 'Assinado', value: signedContracts.length, color: COLORS[2] },
    { name: 'Cancelado', value: cancelledContracts.length, color: COLORS[3] }
  ];

  // Contratos por mês (últimos 6 meses)
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const date = addMonths(now, -i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const contractsInMonth = contracts.filter(c => {
      const createdDate = new Date(c.created_date);
      return createdDate >= monthStart && createdDate <= monthEnd;
    });

    last6Months.push({
      month: format(date, 'MMM', { locale: ptBR }),
      total: contractsInMonth.length,
      signed: contractsInMonth.filter(c => c.status === 'signed').length,
      mrr: contractsInMonth
        .filter(c => c.status === 'signed')
        .reduce((sum, c) => sum + (c.monthly_value || 0), 0)
    });
  }

  // Taxa de conversão
  const conversionRate = totalContracts > 0 
    ? ((signedContracts.length / totalContracts) * 100).toFixed(1)
    : 0;

  return (
    <>
      <AuditPageView pageName="ContractsDashboard" />
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard de Contratos</h1>
            <p className="text-slate-500 text-sm mt-1">Visão geral e métricas de contratos</p>
          </div>
          <Link to={createPageUrl("Contracts")}>
            <Button className="bg-[#355340] hover:bg-[#355340]/90">
              <FileText className="h-4 w-4 mr-2" />
              Ver Todos os Contratos
            </Button>
          </Link>
        </div>

        {/* Stats principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total de Contratos"
            value={totalContracts}
            icon={FileText}
            iconClassName="bg-[#355340]"
          />
          <StatsCard
            title="Contratos Assinados"
            value={signedContracts.length}
            icon={CheckCircle}
            iconClassName="bg-emerald-500"
            subtitle={`${conversionRate}% de conversão`}
          />
          <StatsCard
            title="MRR Total"
            value={`R$ ${totalMRR.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            iconClassName="bg-blue-500"
          />
          <StatsCard
            title="Ticket Médio"
            value={`R$ ${avgContractValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            iconClassName="bg-amber-500"
          />
        </div>

        {/* Alertas de expiração */}
        {(expiringIn30Days.length > 0 || expiringIn60Days.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {expiringIn30Days.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Contratos vencendo em 30 dias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-red-900">{expiringIn30Days.length}</p>
                    <p className="text-xs text-red-600">Ação necessária em breve</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {expiringIn60Days.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
                    <Clock className="h-4 w-4" />
                    Contratos vencendo em 60 dias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-amber-900">{expiringIn60Days.length}</p>
                    <p className="text-xs text-amber-600">Planeje a renovação</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução mensal */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Evolução de Contratos (Últimos 6 Meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={last6Months}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#355340" name="Total" />
                  <Bar dataKey="signed" fill="#62997f" name="Assinados" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por status */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* MRR Evolution */}
          <Card className="border-slate-200 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Evolução do MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={last6Months}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mrr" 
                    stroke="#355340" 
                    strokeWidth={2}
                    name="MRR"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard de Métricas Robusta */}
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Análise de Métricas</h2>
          <ContractMetricsDashboard />
        </div>

        {/* Lista de contratos próximos do vencimento */}
         {expiringIn30Days.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Contratos Próximos do Vencimento (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expiringIn30Days.slice(0, 5).map((contract) => {
                  const client = clients.find(c => c.id === contract.client_id);
                  const daysUntil = differenceInDays(new Date(contract.end_date), now);
                  return (
                    <div key={contract.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">
                          {client?.company_name || "Cliente não identificado"}
                        </p>
                        <p className="text-sm text-slate-500">
                          Contrato #{contract.contract_number || contract.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">
                          {daysUntil} dias restantes
                        </p>
                        <p className="text-xs text-slate-500">
                          Vence em {format(new Date(contract.end_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {expiringIn30Days.length > 5 && (
                  <Link to={createPageUrl("Contracts")}>
                    <Button variant="outline" className="w-full">
                      Ver todos os {expiringIn30Days.length} contratos
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}