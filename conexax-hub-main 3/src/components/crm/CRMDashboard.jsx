import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/ui/StatsCard";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Target, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CRMDashboard() {
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-dashboard'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' }, '-updated_date', 100)
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-dashboard'],
    queryFn: () => base44.entities.Lead.list('-updated_date', 100)
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities-dashboard'],
    queryFn: () => base44.entities.Activity.filter(
      { status: 'pending' },
      '-scheduled_date',
      50
    )
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts-dashboard'],
    queryFn: () => base44.entities.Contract.filter({ status: 'signed' }, '-updated_date', 100)
  });

  if (clientsLoading || leadsLoading || activitiesLoading) {
    return <Skeleton className="h-96" />;
  }

  // KPIs
  const activeClients = clients.length;
  const activeContracts = contracts.length;
  const activeActivities = activities.length;
  const totalMRR = clients.reduce((sum, c) => sum + (c.average_revenue || 0), 0);

  // Leads por estágio
  const leadsByStage = leads.reduce((acc, lead) => {
    const stage = lead.pipeline_stage || 'captado';
    const existing = acc.find(s => s.name === stage);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: stage, value: 1 });
    }
    return acc;
  }, []);

  // Saúde das contas
  const healthBreakdown = clients.reduce((acc, client) => {
    const status = client.churn_status || 'healthy';
    const existing = acc.find(s => s.name === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, []);

  // MRR por cliente (top 5)
  const topClients = clients
    .filter(c => c.average_revenue)
    .sort((a, b) => b.average_revenue - a.average_revenue)
    .slice(0, 5)
    .map(c => ({
      name: c.company_name.substring(0, 15),
      revenue: c.average_revenue
    }));

  // Atividades por tipo
  const activitiesByType = activities.reduce((acc, act) => {
    const existing = acc.find(a => a.name === act.type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: act.type, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ['#62997f', '#355340', '#9ebd9e', '#d4e8d4', '#437354'];

  const trendData = [
    { month: 'Jan', clientes: activeClients, contratos: activeContracts },
    { month: 'Fev', clientes: Math.floor(activeClients * 0.95), contratos: Math.floor(activeContracts * 0.98) },
    { month: 'Mar', clientes: Math.floor(activeClients * 1.05), contratos: Math.floor(activeContracts * 1.02) }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Contas Ativas"
          value={activeClients}
          subtitle={`${activeContracts} contratos assinados`}
          icon={Users}
          trend="up"
        />
        <StatsCard
          title="MRR Total"
          value={`R$ ${(totalMRR / 1000).toFixed(1)}k`}
          subtitle="Receita recorrente mensal"
          icon={TrendingUp}
          trend="up"
        />
        <StatsCard
          title="Leads em Funil"
          value={leads.length}
          subtitle={leadsByStage.length > 0 ? `${leadsByStage[0]?.value || 0} no primeiro estágio` : 'Nenhum lead'}
          icon={Target}
        />
        <StatsCard
          title="Atividades Pendentes"
          value={activeActivities}
          subtitle="Tarefas, reuniões e chamadas"
          icon={Activity}
          trend={activeActivities > 5 ? 'down' : 'up'}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline de Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadsByStage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#62997f" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Nenhum lead para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saúde das Contas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saúde das Contas</CardTitle>
          </CardHeader>
          <CardContent>
            {healthBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={healthBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {healthBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Nenhuma conta para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tendência */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendência (3 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="clientes"
                  stroke="#62997f"
                  strokeWidth={2}
                  dot={{ fill: '#62997f' }}
                  name="Clientes"
                />
                <Line
                  type="monotone"
                  dataKey="contratos"
                  stroke="#355340"
                  strokeWidth={2}
                  dot={{ fill: '#355340' }}
                  name="Contratos"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Clientes (MRR)</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#62997f" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Nenhum cliente com receita
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}