import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function ActivitiesSummaryReport({ filters }) {
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', filters],
    queryFn: () => base44.entities.Activity.list(),
  });

  const activitySummary = useMemo(() => {
    const summary = {
      total: activities.length,
      byType: {},
      byStatus: {},
      byPriority: {}
    };

    activities.forEach(activity => {
      // Por tipo
      summary.byType[activity.type] = (summary.byType[activity.type] || 0) + 1;
      // Por status
      summary.byStatus[activity.status] = (summary.byStatus[activity.status] || 0) + 1;
      // Por prioridade
      summary.byPriority[activity.priority] = (summary.byPriority[activity.priority] || 0) + 1;
    });

    return summary;
  }, [activities]);

  const typeLabels = {
    'task': 'Tarefas',
    'call': 'Ligações',
    'meeting': 'Reuniões',
    'email': 'E-mails',
    'note': 'Notas'
  };

  const statusLabels = {
    'pending': 'Pendentes',
    'in_progress': 'Em Andamento',
    'completed': 'Concluídas',
    'cancelled': 'Canceladas'
  };

  const priorityLabels = {
    'low': 'Baixa',
    'medium': 'Média',
    'high': 'Alta'
  };

  const completed = activitySummary.byStatus['completed'] || 0;
  const pending = activitySummary.byStatus['pending'] || 0;
  const inProgress = activitySummary.byStatus['in_progress'] || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Total de Atividades</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">{activitySummary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Concluídas
            </div>
            <div className="text-3xl font-bold text-emerald-600 mt-2">{completed}</div>
            <div className="text-xs text-slate-500 mt-2">
              {activitySummary.total > 0 ? ((completed / activitySummary.total) * 100).toFixed(0) : 0}% taxa
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Em Progresso
            </div>
            <div className="text-3xl font-bold text-amber-600 mt-2">{inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Pendentes
            </div>
            <div className="text-3xl font-bold text-red-600 mt-2">{pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(activitySummary.byType).map(([type, count]) => (
            <div key={type}>
              <div className="flex justify-between items-center mb-2">
                <p className="font-medium text-slate-900">{typeLabels[type] || type}</p>
                <Badge variant="outline">{count}</Badge>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#355340] to-[#62997f] h-full flex items-center justify-end pr-2 text-xs font-semibold text-white"
                  style={{ width: `${(count / activitySummary.total) * 100}%` }}
                >
                  {((count / activitySummary.total) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(activitySummary.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{statusLabels[status] || status}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Prioridade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(activitySummary.byPriority).map(([priority, count]) => {
              const colors = {
                'low': 'bg-blue-100 text-blue-800',
                'medium': 'bg-amber-100 text-amber-800',
                'high': 'bg-red-100 text-red-800'
              };
              return (
                <div key={priority} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{priorityLabels[priority]}</span>
                  <Badge className={colors[priority]}>{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}