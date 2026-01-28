import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  TrendingUp,
  DollarSign,
  Target,
  Award,
  Users,
  Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import StatsCard from "@/components/ui/StatsCard";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#355340", "#62997f", "#10b981", "#f59e0b", "#3b82f6", "#ec4899"];

export default function CommercialDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("2024-01");

  const { data: commercialTeam = [] } = useQuery({
    queryKey: ["commercialTeam"],
    queryFn: () => base44.entities.CommercialTeamMember.list(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["metrics"],
    queryFn: () => base44.entities.Metric.list("-period", 500),
  });

  const activeContracts = contracts.filter(c => c.status === "active");
  const totalMonthlyRevenue = activeContracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);
  const totalGoal = commercialTeam.reduce((sum, m) => sum + (m.monthly_goal || 0), 0);
  const goalProgress = totalGoal > 0 ? (totalMonthlyRevenue / totalGoal) * 100 : 0;

  const sellerPerformance = commercialTeam.map(seller => {
    const sellerContracts = contracts.filter(c => c.seller_id === seller.id);
    const activeSellerContracts = sellerContracts.filter(c => c.status === "active");
    const revenue = activeSellerContracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);
    const clientCount = clients.filter(c => c.commercial_team_id === seller.id).length;
    const goalAchievement = seller.monthly_goal > 0 ? (revenue / seller.monthly_goal) * 100 : 0;
    
    return {
      name: seller.name,
      revenue: revenue,
      goal: seller.monthly_goal || 0,
      contracts: sellerContracts.length,
      clients: clientCount,
      achievement: goalAchievement,
      commission: revenue * ((seller.commission_percentage || 0) / 100)
    };
  });

  const contractsByStatus = [
    { name: "Ativos", value: contracts.filter(c => c.status === "active").length },
    { name: "Em Negociação", value: contracts.filter(c => c.status === "negotiation").length },
    { name: "Encerrados", value: contracts.filter(c => c.status === "ended").length },
    { name: "Cancelados", value: contracts.filter(c => c.status === "cancelled").length }
  ].filter(item => item.value > 0);

  const monthlyTrend = metrics
    .slice(0, 6)
    .reverse()
    .reduce((acc, metric) => {
      const existing = acc.find(a => a.period === metric.period);
      if (existing) {
        existing.revenue += metric.monthly_revenue || 0;
        existing.orders += metric.orders_count || 0;
      } else {
        acc.push({
          period: metric.period,
          revenue: metric.monthly_revenue || 0,
          orders: metric.orders_count || 0
        });
      }
      return acc;
    }, []);

  const topSeller = sellerPerformance.reduce((max, seller) => 
    seller.revenue > (max?.revenue || 0) ? seller : max, null
  );

  const totalCommissions = sellerPerformance.reduce((sum, s) => sum + s.commission, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Comercial</h1>
          <p className="text-slate-500 text-sm mt-1">Análise detalhada de performance e resultados</p>
        </div>
        <div className="w-40">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-01">Janeiro 2024</SelectItem>
              <SelectItem value="2023-12">Dezembro 2023</SelectItem>
              <SelectItem value="2023-11">Novembro 2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard 
          title="Receita Recorrente" 
          value={`R$ ${totalMonthlyRevenue.toLocaleString("pt-BR")}`} 
          icon={DollarSign} 
        />
        <StatsCard 
          title="Meta do Mês" 
          value={`R$ ${totalGoal.toLocaleString("pt-BR")}`} 
          subtitle={`${goalProgress.toFixed(0)}% atingido`}
          icon={Target} 
          iconClassName="bg-amber-500" 
        />
        <StatsCard 
          title="Contratos Ativos" 
          value={activeContracts.length} 
          icon={Briefcase} 
          iconClassName="bg-emerald-500" 
        />
        <StatsCard 
          title="Comissões" 
          value={`R$ ${totalCommissions.toLocaleString("pt-BR")}`} 
          icon={Award} 
          iconClassName="bg-blue-500" 
        />
        <StatsCard 
          title="Vendedores" 
          value={commercialTeam.length} 
          subtitle={topSeller ? `Destaque: ${topSeller.name.split(" ")[0]}` : ""}
          icon={Users} 
          iconClassName="bg-[#355340]" 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seller Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Individual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sellerPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    formatter={(value) => value.toLocaleString("pt-BR")}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#355340" name="Receita" />
                  <Bar dataKey="goal" fill="#e2e8f0" name="Meta" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Contracts Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {contractsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendência de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toLocaleString("pt-BR")}`}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#355340" name="Receita" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Seller Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sellerPerformance
                .sort((a, b) => b.revenue - a.revenue)
                .map((seller, index) => (
                  <div key={seller.name} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? "bg-amber-100 text-amber-700" :
                      index === 1 ? "bg-slate-100 text-slate-600" :
                      index === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-slate-50 text-slate-500"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{seller.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{seller.contracts} contratos</span>
                        <span>•</span>
                        <span>{seller.clients} clientes</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">R$ {seller.revenue.toLocaleString("pt-BR")}</p>
                      <p className={`text-xs ${seller.achievement >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                        {seller.achievement.toFixed(0)}% da meta
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo da Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {contracts.length}
              </p>
              <p className="text-sm text-slate-500 mt-1">Total de Contratos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                R$ {(totalMonthlyRevenue * 12).toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-slate-500 mt-1">Receita Anual</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {goalProgress.toFixed(0)}%
              </p>
              <p className="text-sm text-slate-500 mt-1">Atingimento</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                R$ {(totalMonthlyRevenue / activeContracts.length || 0).toFixed(0)}
              </p>
              <p className="text-sm text-slate-500 mt-1">Ticket Médio</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {clients.length}
              </p>
              <p className="text-sm text-slate-500 mt-1">Clientes Ativos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}