import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, addMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/ui/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Zap, Clock, Target } from "lucide-react";

const COLORS = ['#355340', '#62997f', '#f59e0b', '#dc2626', '#3b82f6'];

export default function ContractMetricsDashboard() {
  const [timeRange, setTimeRange] = useState("6m");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date", 500),
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["contractSignatures"],
    queryFn: () => base44.entities.ContractSignature.list("-created_date", 500),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  // Métricas principais
  const totalContracts = contracts.length;
  const signedContracts = contracts.filter(c => c.status === "signed");
  const conversionRate = totalContracts > 0 
    ? ((signedContracts.length / totalContracts) * 100).toFixed(1)
    : 0;

  // Tempo médio de assinatura (dias entre criação e assinatura)
  const signatureTimes = signatures
    .filter(s => s.signed_date && s.sent_date)
    .map(s => ({
      days: differenceInDays(new Date(s.signed_date), new Date(s.sent_date)),
      contract_id: s.contract_id
    }));

  const avgSignatureTime = signatureTimes.length > 0
    ? (signatureTimes.reduce((sum, s) => sum + s.days, 0) / signatureTimes.length).toFixed(1)
    : 0;

  // Taxa de conclusão de assinatura
  const sentForSignature = signatures.filter(s => s.status !== "pending").length;
  const signedViaSignature = signatures.filter(s => s.status === "signed").length;
  const signatureCompletionRate = sentForSignature > 0
    ? ((signedViaSignature / sentForSignature) * 100).toFixed(1)
    : 0;

  // Últimos 12 meses
  const now = new Date();
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const date = addMonths(now, -i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const contractsInMonth = contracts.filter(c => {
      const createdDate = new Date(c.created_date);
      return createdDate >= monthStart && createdDate <= monthEnd;
    });

    const signedInMonth = contractsInMonth.filter(c => c.status === "signed").length;
    const mrrInMonth = contractsInMonth
      .filter(c => c.status === "signed")
      .reduce((sum, c) => sum + (c.monthly_value || 0), 0);

    monthlyData.push({
      month: format(date, "MMM", { locale: ptBR }),
      created: contractsInMonth.length,
      signed: signedInMonth,
      mrr: mrrInMonth,
      avgValue: contractsInMonth.length > 0
        ? (mrrInMonth / contractsInMonth.length).toFixed(0)
        : 0
    });
  }

  // Taxa de conversão por mês
  const conversionByMonth = monthlyData.map(m => ({
    month: m.month,
    rate: m.created > 0 ? ((m.signed / m.created) * 100).toFixed(1) : 0
  }));

  // Distribuição de tempo de assinatura
  const signatureTimeDistribution = [
    {
      range: "0-5 dias",
      count: signatureTimes.filter(s => s.days <= 5).length
    },
    {
      range: "6-10 dias",
      count: signatureTimes.filter(s => s.days > 5 && s.days <= 10).length
    },
    {
      range: "11-20 dias",
      count: signatureTimes.filter(s => s.days > 10 && s.days <= 20).length
    },
    {
      range: "+21 dias",
      count: signatureTimes.filter(s => s.days > 20).length
    }
  ];

  // Pipeline (funil de conversão)
  const pipelineData = [
    { stage: "Rascunho", value: contracts.filter(c => c.status === "draft").length },
    { stage: "Enviado", value: contracts.filter(c => c.status === "sent").length },
    { stage: "Assinado", value: signedContracts.length },
    { stage: "Cancelado", value: contracts.filter(c => c.status === "cancelled").length }
  ];

  return (
    <div className="space-y-6">
      {/* Stats principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Taxa de Conversão"
          value={`${conversionRate}%`}
          icon={Target}
          iconClassName="bg-green-500"
          subtitle={`${signedContracts.length} de ${totalContracts}`}
        />
        <StatsCard
          title="Tempo Médio de Assinatura"
          value={`${avgSignatureTime} dias`}
          icon={Clock}
          iconClassName="bg-blue-500"
        />
        <StatsCard
          title="Taxa de Conclusão"
          value={`${signatureCompletionRate}%`}
          icon={TrendingUp}
          iconClassName="bg-amber-500"
          subtitle={`${signedViaSignature} assinados`}
        />
        <StatsCard
          title="Contratos Pendentes"
          value={contracts.filter(c => c.status === "draft" || c.status === "sent").length}
          icon={Zap}
          iconClassName="bg-red-500"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taxa de conversão por mês */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Taxa de Conversão (Últimos 12 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#355340"
                  strokeWidth={2}
                  name="Taxa (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contratos criados vs assinados */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Criados vs Assinados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" fill="#355340" name="Criados" />
                <Bar dataKey="signed" fill="#62997f" name="Assinados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição de tempo de assinatura */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Tempo de Assinatura</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={signatureTimeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Contratos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MRR por mês */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Evolução do MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Area type="monotone" dataKey="mrr" fill="#62997f" stroke="#355340" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline (funil) */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Pipeline de Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pipelineData.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{item.stage}</span>
                  <span className="text-sm text-slate-600">{item.value} contratos</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-[#355340] h-2 rounded-full transition-all"
                    style={{
                      width: `${totalContracts > 0 ? (item.value / totalContracts) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}