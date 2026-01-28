import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, TrendingUp, Users, Activity, Eye, MousePointer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsSettings() {
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.Activity.list(),
  });

  const leadsThisMonth = leads.filter(l => {
    if (!l.created_date) return false;
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return new Date(l.created_date) >= monthAgo;
  }).length;

  const activeClients = clients.filter(c => c.status === "active").length;
  const completedActivities = activities.filter(a => a.status === "completed").length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Análises</h1>
        <p className="text-slate-500 mt-1">Métricas e estatísticas do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Leads (Mês)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{leadsThisMonth}</p>
              </div>
              <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Clientes Ativos</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{activeClients}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Atividades Concluídas</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{completedActivities}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart className="h-5 w-5 text-violet-600" />
            Resumo Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">Total de Clientes</p>
                <p className="text-sm text-slate-500">Todos os registros</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900">{clients.length}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <MousePointer className="h-5 w-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">Total de Leads</p>
                <p className="text-sm text-slate-500">Todos os registros</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900">{leads.length}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">Total de Atividades</p>
                <p className="text-sm text-slate-500">Todos os registros</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900">{activities.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <BarChart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Análises Avançadas</h3>
            <p className="text-slate-500 mb-6">
              Gráficos detalhados e relatórios personalizados estarão<br />
              disponíveis em breve para análise profunda dos dados.
            </p>
            <Badge variant="outline">Em breve</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}