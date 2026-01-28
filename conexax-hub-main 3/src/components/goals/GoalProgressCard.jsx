import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const GOAL_UNITS = {
  'qualified_leads': 'leads',
  'closed_contracts': 'contratos',
  'contract_value': 'R$',
  'activities_completed': 'atividades',
  'client_retention': '%'
};

export default function GoalProgressCard({ goal }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'achieved': return 'bg-emerald-100 text-emerald-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'not_started': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'achieved': return '✅ Atingida';
      case 'at_risk': return '⚠️ Em Risco';
      case 'in_progress': return '📊 Em Progresso';
      case 'not_started': return '⏳ Não Iniciada';
      default: return status;
    }
  };

  const statusIcon = {
    achieved: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    at_risk: <AlertCircle className="h-5 w-5 text-red-600" />,
    in_progress: <TrendingUp className="h-5 w-5 text-blue-600" />,
    not_started: <TrendingUp className="h-5 w-5 text-slate-600" />
  };

  const unit = GOAL_UNITS[goal.goal_type] || '';
  const daysRemaining = Math.ceil((new Date(goal.end_date) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{goal.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{goal.user_name}</p>
            </div>
            {statusIcon[goal.status]}
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">
                {goal.current_value} / {goal.target_value} {unit}
              </span>
              <Badge className={getStatusColor(goal.status)}>
                {getStatusLabel(goal.status)}
              </Badge>
            </div>
            <Progress value={goal.progress_percentage || 0} className="h-2" />
            <p className="text-xs text-slate-600 mt-2">{goal.progress_percentage || 0}% concluído</p>
          </div>

          {/* Dates */}
          <div className="text-xs text-slate-500 space-y-1 pt-2 border-t">
            <p>Período: {format(new Date(goal.start_date), 'dd MMM', { locale: ptBR })} - {format(new Date(goal.end_date), 'dd MMM', { locale: ptBR })}</p>
            {daysRemaining > 0 ? (
              <p className="text-blue-600 font-medium">Faltam {daysRemaining} dias</p>
            ) : (
              <p className="text-slate-600">Período finalizado</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}