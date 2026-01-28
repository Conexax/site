import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, BarChart3, Activity } from "lucide-react";

const templates = [
  {
    id: 'sales-funnel',
    name: 'Funil de Vendas',
    description: 'Análise de leads por estágio do pipeline e taxa de conversão',
    icon: TrendingUp,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'sdr-performance',
    name: 'Performance de SDRs',
    description: 'Leads qualificados, handoffs e métricas por SDR',
    icon: Users,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'client-retention',
    name: 'Retenção de Clientes',
    description: 'Análise de churn, health score e valor de contratos',
    icon: Activity,
    color: 'bg-emerald-100 text-emerald-600'
  },
  {
    id: 'activities-summary',
    name: 'Resumo de Atividades',
    description: 'Distribuição de tarefas, reuniões e calls realizadas',
    icon: BarChart3,
    color: 'bg-amber-100 text-amber-600'
  }
];

export default function ReportTemplateSelector({ onSelectTemplate }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template) => {
        const Icon = template.icon;
        return (
          <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelectTemplate(template.id)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="mt-1">{template.description}</CardDescription>
                </div>
                <div className={`p-3 rounded-lg ${template.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTemplate(template.id);
                }}
                className="w-full bg-[#355340] hover:bg-[#355340]/90"
              >
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}