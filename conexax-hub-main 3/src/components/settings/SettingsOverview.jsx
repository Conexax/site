import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, TrendingUp, Package, Database, Zap } from "lucide-react";

export default function SettingsOverview() {
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.Activity.list(),
  });

  const stats = [
    { label: "Clientes", value: clients.length, icon: Building2, color: "bg-blue-100 text-blue-600" },
    { label: "Usuários", value: users.length, icon: Users, color: "bg-purple-100 text-purple-600" },
    { label: "Planos", value: plans.length, icon: Package, color: "bg-emerald-100 text-emerald-600" },
    { label: "Atividades", value: activities.length, icon: TrendingUp, color: "bg-orange-100 text-orange-600" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Visão Geral</h1>
        <p className="text-slate-500">Dashboard das configurações do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Versão</span>
              <span className="text-sm font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Ambiente</span>
              <span className="text-sm font-medium">Produção</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Última atualização</span>
              <span className="text-sm font-medium">Janeiro 2026</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Integrações Ativas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Base44 SDK</span>
              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">Ativo</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Webhooks</span>
              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">Ativo</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Email</span>
              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">Ativo</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}