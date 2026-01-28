import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Calendar, Users, Target, Clock, Lightbulb, Activity as ActivityIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    label: "Saudável",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200"
  },
  attention: {
    icon: AlertTriangle,
    label: "Atenção",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200"
  },
  risk: {
    icon: AlertCircle,
    label: "Risco Alto",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  }
};

export default function ChurnDashboard({ open, onClose, client }) {
  const [period, setPeriod] = useState("30");

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['churn-activities', client?.id, period],
    queryFn: () => base44.entities.Activity.filter({ client_id: client?.id }),
    enabled: !!client?.id && open
  });

  const { data: metrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ['churn-metrics', client?.id],
    queryFn: () => base44.entities.Metric.filter({ client_id: client?.id }),
    enabled: !!client?.id && open
  });

  if (!client) return null;

  const status = client.churn_status || "healthy";
  const score = client.churn_score || 0;
  const factors = client.churn_factors || [];
  const config = statusConfig[status];
  const Icon = config.icon;

  const now = new Date();
  const periodDays = parseInt(period);
  const periodStart = subDays(now, periodDays);

  // Análise de atividades
  const recentActivities = activities.filter(a => {
    const createdDate = new Date(a.created_date);
    return createdDate >= periodStart;
  });

  const overdueActivities = activities.filter(a => {
    if (a.status === 'completed') return false;
    if (!a.due_date) return false;
    return new Date(a.due_date) < now;
  });

  const avgDelayDays = overdueActivities.length > 0
    ? overdueActivities.reduce((sum, a) => {
        const delay = (now - new Date(a.due_date)) / (1000 * 60 * 60 * 24);
        return sum + delay;
      }, 0) / overdueActivities.length
    : 0;

  // Análise de métricas
  const recentMetrics = metrics
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 3);

  const latestMetric = recentMetrics[0];
  const previousMetric = recentMetrics[1];

  // Últimas atividades registradas
  const lastActivityDate = activities.length > 0
    ? new Date(Math.max(...activities.map(a => new Date(a.updated_date))))
    : null;

  const daysSinceLastActivity = lastActivityDate
    ? Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24))
    : null;

  // Recomendações
  const recommendations = [];
  
  if (recentActivities.length < 3) {
    recommendations.push({
      title: "Agendar reunião de alinhamento",
      description: "Baixa atividade detectada. Agende uma reunião para entender necessidades.",
      priority: "high"
    });
  }

  if (overdueActivities.length > 0) {
    recommendations.push({
      title: "Destravar atividades atrasadas",
      description: `${overdueActivities.length} atividades pendentes. Revisar prioridades e desbloquear entregas.`,
      priority: "high"
    });
  }

  if (latestMetric?.growth_percentage < 0) {
    recommendations.push({
      title: "Revisar metas e estratégia",
      description: "Crescimento negativo. Analisar causas e ajustar estratégia comercial.",
      priority: "medium"
    });
  }

  if (daysSinceLastActivity && daysSinceLastActivity > 14) {
    recommendations.push({
      title: "Retomar contato com cliente",
      description: `Sem interações há ${daysSinceLastActivity} dias. Retomar contato para entender situação.`,
      priority: "high"
    });
  }

  // Timeline de eventos
  const timeline = [];
  
  if (client.churn_updated_at) {
    timeline.push({
      date: new Date(client.churn_updated_at),
      title: "Score de churn atualizado",
      description: `Status: ${config.label} (${score.toFixed(0)} pontos)`,
      type: status
    });
  }

  overdueActivities.slice(0, 3).forEach(a => {
    timeline.push({
      date: new Date(a.due_date),
      title: "Atividade atrasada",
      description: a.title,
      type: "warning"
    });
  });

  if (latestMetric) {
    const [year, month] = latestMetric.period.split('-');
    timeline.push({
      date: new Date(year, month - 1),
      title: "Métrica registrada",
      description: `${latestMetric.growth_percentage >= 0 ? '+' : ''}${latestMetric.growth_percentage?.toFixed(1)}% crescimento`,
      type: latestMetric.growth_percentage >= 0 ? "positive" : "negative"
    });
  }

  timeline.sort((a, b) => b.date - a.date);

  const isLoading = loadingActivities || loadingMetrics;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Análise de Risco de Churn</DialogTitle>
          <p className="text-sm text-slate-500">{client.company_name}</p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status e Score */}
          <Card className={`border-2 ${config.borderColor}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-8 w-8 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status Atual</p>
                    <p className={`text-2xl font-bold ${config.color}`}>{config.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Score de Risco</p>
                  <p className={`text-4xl font-bold ${config.color}`}>{score.toFixed(0)}</p>
                  <p className="text-xs text-slate-400">de 100</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtro de Período */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Período de análise:</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ) : (
            <>
              {/* Fatores de Risco */}
              {factors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Fatores de Risco Identificados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {factors.map((factor, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-700">{factor}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Evidências por Fator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Atividade */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ActivityIcon className="h-4 w-4 text-[#355340]" />
                      Atividade no Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Atividades no período</span>
                      <span className="font-semibold text-lg">{recentActivities.length}</span>
                    </div>
                    {daysSinceLastActivity !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Dias desde última interação</span>
                        <span className={`font-semibold ${daysSinceLastActivity > 14 ? 'text-red-600' : 'text-slate-700'}`}>
                          {daysSinceLastActivity}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-slate-400">
                        {recentActivities.length === 0 && "⚠️ Nenhuma atividade registrada"}
                        {recentActivities.length > 0 && recentActivities.length < 3 && "⚠️ Baixa frequência de atividades"}
                        {recentActivities.length >= 3 && "✓ Atividade dentro do esperado"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Metas e Resultados */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-[#355340]" />
                      Resultados vs Meta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {latestMetric ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Crescimento atual</span>
                          <span className={`font-semibold flex items-center gap-1 ${latestMetric.growth_percentage >= 5 ? 'text-emerald-600' : latestMetric.growth_percentage >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {latestMetric.growth_percentage >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {latestMetric.growth_percentage?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">ROI</span>
                          <span className={`font-semibold ${latestMetric.roi >= 2 ? 'text-emerald-600' : latestMetric.roi >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {latestMetric.roi?.toFixed(2)}x
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-slate-400">
                            {latestMetric.growth_percentage < 0 && "⚠️ Crescimento negativo - revisar estratégia"}
                            {latestMetric.growth_percentage >= 0 && latestMetric.growth_percentage < 5 && "⚠️ Crescimento abaixo da meta"}
                            {latestMetric.growth_percentage >= 5 && "✓ Performance dentro do esperado"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">Sem métricas registradas</p>
                    )}
                  </CardContent>
                </Card>

                {/* Atrasos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#355340]" />
                      Atrasos Operacionais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Atividades atrasadas</span>
                      <span className={`font-semibold text-lg ${overdueActivities.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {overdueActivities.length}
                      </span>
                    </div>
                    {avgDelayDays > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Atraso médio</span>
                        <span className="font-semibold text-red-600">
                          {avgDelayDays.toFixed(0)} dias
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-slate-400">
                        {overdueActivities.length === 0 && "✓ Nenhuma atividade atrasada"}
                        {overdueActivities.length >= 5 && "⚠️ Múltiplas atividades atrasadas - ação urgente"}
                        {overdueActivities.length > 0 && overdueActivities.length < 5 && "⚠️ Atrasos identificados - acompanhar"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Interações */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#355340]" />
                      Interações e Reuniões
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Última interação</span>
                      <span className="font-semibold text-sm">
                        {lastActivityDate ? `${daysSinceLastActivity} dias atrás` : "Nunca"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Total no período</span>
                      <span className="font-semibold text-lg">{recentActivities.length}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-slate-400">
                        {daysSinceLastActivity > 30 && "⚠️ Muito tempo sem contato - retomar urgente"}
                        {daysSinceLastActivity > 14 && daysSinceLastActivity <= 30 && "⚠️ Intervalo longo sem contato"}
                        {daysSinceLastActivity <= 14 && "✓ Contato recente mantido"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              {timeline.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Linha do Tempo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {timeline.slice(0, 8).map((event, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            event.type === 'risk' ? 'bg-red-500' :
                            event.type === 'attention' ? 'bg-yellow-500' :
                            event.type === 'healthy' ? 'bg-emerald-500' :
                            event.type === 'warning' ? 'bg-amber-500' :
                            event.type === 'negative' ? 'bg-red-400' :
                            'bg-blue-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-slate-700">{event.title}</p>
                              <span className="text-xs text-slate-400">
                                {format(event.date, "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recomendações */}
              {recommendations.length > 0 && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      Recomendações de Ação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.map((rec, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-lg border border-blue-200">
                        <div className="flex items-start gap-3">
                          <Badge className={rec.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}>
                            {rec.priority === 'high' ? 'Urgente' : 'Importante'}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-slate-800">{rec.title}</p>
                            <p className="text-xs text-slate-600 mt-1">{rec.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Histórico de Métricas */}
              {recentMetrics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Histórico de Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentMetrics.map((metric) => (
                        <div key={metric.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{metric.period}</p>
                            <p className="text-xs text-slate-500">
                              {metric.orders_count || 0} pedidos • Ticket: R$ {metric.average_ticket?.toFixed(2) || 0}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${metric.growth_percentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {metric.growth_percentage >= 0 ? '+' : ''}{metric.growth_percentage?.toFixed(1)}%
                            </p>
                            <p className="text-xs text-slate-500">R$ {metric.monthly_revenue?.toLocaleString('pt-BR') || 0}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}