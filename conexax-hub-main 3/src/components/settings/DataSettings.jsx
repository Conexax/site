import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Table, FileText, Activity, Users, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DataSettings() {
  const entities = [
    { name: "Client", icon: Building2, description: "Clientes da plataforma", color: "bg-blue-100 text-blue-600" },
    { name: "User", icon: Users, description: "Usuários do sistema", color: "bg-purple-100 text-purple-600" },
    { name: "Activity", icon: Activity, description: "Atividades e tarefas", color: "bg-orange-100 text-orange-600" },
    { name: "Contract", icon: FileText, description: "Contratos dos clientes", color: "bg-emerald-100 text-emerald-600" },
    { name: "Plan", icon: Table, description: "Planos disponíveis", color: "bg-violet-100 text-violet-600" },
    { name: "Lead", icon: Table, description: "Leads do kanban", color: "bg-pink-100 text-pink-600" },
    { name: "Metric", icon: Table, description: "Métricas dos clientes", color: "bg-indigo-100 text-indigo-600" },
    { name: "CommercialTeamMember", icon: Users, description: "Equipe comercial", color: "bg-cyan-100 text-cyan-600" },
    { name: "OperationalTeamMember", icon: Users, description: "Equipe operacional", color: "bg-teal-100 text-teal-600" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Dados</h1>
        <p className="text-slate-500">Entidades e estruturas de dados do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5" />
            Entidades Cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entities.map((entity) => (
              <Card key={entity.name} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${entity.color}`}>
                      <entity.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entity.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{entity.description}</p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        Ativa
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Banco de Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Total de Entidades</span>
            <span className="text-sm font-medium">{entities.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Tipo de Banco</span>
            <span className="text-sm font-medium">Base44 Cloud</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Status</span>
            <Badge className="bg-emerald-100 text-emerald-700">Online</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}