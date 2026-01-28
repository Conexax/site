import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity, AlertCircle, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ClientHealthDashboard({ clientId }) {
  const queryClient = useQueryClient();

  const { data: healthScore, isLoading } = useQuery({
    queryKey: ['health-score', clientId],
    queryFn: async () => {
      const results = await base44.entities.ClientHealthScore.filter({ client_id: clientId });
      return results.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0] || null;
    }
  });

  const calculateHealthMutation = useMutation({
    mutationFn: () => base44.functions.invoke('calculateClientHealth', { clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-score', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Health score calculado!');
    }
  });

  const getStatusColor = (status) => {
    if (status === 'healthy') return 'bg-emerald-500';
    if (status === 'at_risk') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!healthScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Nenhum health score calculado ainda</p>
            <Button
              onClick={() => calculateHealthMutation.mutate()}
              disabled={calculateHealthMutation.isPending}
              className="bg-[#355340]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Calcular Health Score
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Health Score Geral</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => calculateHealthMutation.mutate()}
              disabled={calculateHealthMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <span className={`text-5xl font-bold ${getScoreColor(healthScore.overall_score)}`}>
                  {healthScore.overall_score}
                </span>
                <div>
                  {healthScore.trend === 'improving' && <TrendingUp className="h-6 w-6 text-emerald-600" />}
                  {healthScore.trend === 'declining' && <TrendingDown className="h-6 w-6 text-red-600" />}
                  {healthScore.trend === 'stable' && <Minus className="h-6 w-6 text-slate-400" />}
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Atualizado em {format(new Date(healthScore.calculated_at), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            </div>
            <Badge className={getStatusColor(healthScore.health_status)}>
              {healthScore.health_status === 'healthy' ? 'Saudável' :
               healthScore.health_status === 'at_risk' ? 'Em Risco' : 'Crítico'}
            </Badge>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Uso do Produto</span>
                <span className="font-medium">{healthScore.product_usage_score?.toFixed(0) || 0}</span>
              </div>
              <Progress value={healthScore.product_usage_score || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Suporte</span>
                <span className="font-medium">{healthScore.support_score?.toFixed(0) || 0}</span>
              </div>
              <Progress value={healthScore.support_score || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Contrato</span>
                <span className="font-medium">{healthScore.contract_score?.toFixed(0) || 0}</span>
              </div>
              <Progress value={healthScore.contract_score || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Engajamento</span>
                <span className="font-medium">{healthScore.engagement_score?.toFixed(0) || 0}</span>
              </div>
              <Progress value={healthScore.engagement_score || 0} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      {healthScore.risk_factors && healthScore.risk_factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Fatores de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {healthScore.risk_factors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <span className="text-slate-700">{factor}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {healthScore.recommendations && healthScore.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-500" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {healthScore.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span className="text-slate-700">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {healthScore.ai_insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              Insights de IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-line">{healthScore.ai_insights}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}