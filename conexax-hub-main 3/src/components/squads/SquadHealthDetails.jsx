import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const trendConfig = {
  improving: { icon: TrendingUp, color: "text-emerald-600", label: "Melhorando" },
  stable: { icon: Minus, color: "text-slate-600", label: "Estável" },
  declining: { icon: TrendingDown, color: "text-red-600", label: "Piorando" }
};

export default function SquadHealthDetails({ open, onOpenChange, score }) {
  if (!score) return null;

  const trendConfig_ = trendConfig[score.trend] || trendConfig.stable;
  const TrendIcon = trendConfig_.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Saúde do Squad: {score.squad_name}
            <Badge className={
              score.health_status === 'healthy' ? 'bg-emerald-100 text-emerald-800' :
              score.health_status === 'stretched' ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }>
              {score.health_status === 'healthy' ? '🟢' : score.health_status === 'stretched' ? '🟡' : '🔴'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Geral */}
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Score Geral</CardTitle>
                <div className="flex items-center gap-2">
                  <TrendIcon className={cn("h-4 w-4", trendConfig_.color)} />
                  <span className={cn("text-sm font-medium", trendConfig_.color)}>
                    {trendConfig_.label}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Pontuação</span>
                  <span className="text-2xl font-bold text-[#355340]">
                    {Math.round(score.overall_score)}/100
                  </span>
                </div>
                <Progress 
                  value={score.overall_score} 
                  className="h-3"
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm pt-2">
                <div>
                  <p className="text-slate-500">Período</p>
                  <p className="font-medium">{score.period_start} a {score.period_end}</p>
                </div>
                <div>
                  <p className="text-slate-500">Última Atualização</p>
                  <p className="font-medium">
                    {new Date(score.calculated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fatores */}
          <div className="grid grid-cols-2 gap-4">
            {/* Capacidade */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm">Capacidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Score</span>
                    <span className="font-semibold">{Math.round(score.capacity_score)}</span>
                  </div>
                  <Progress value={score.capacity_score} className="h-2" />
                </div>
                <p className="text-xs text-slate-500">
                  {Math.round(score.capacity_usage_percentage)}% da capacidade
                </p>
              </CardContent>
            </Card>

            {/* SLA */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm">SLA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Score</span>
                    <span className="font-semibold">{Math.round(score.sla_score)}</span>
                  </div>
                  <Progress value={score.sla_score} className="h-2" />
                </div>
                <p className="text-xs text-slate-500">
                  {Math.round(score.sla_compliance_percentage)}% cumprimento
                </p>
              </CardContent>
            </Card>

            {/* Volume de Demandas */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm">Volume de Demandas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Score</span>
                    <span className="font-semibold">{Math.round(score.demand_volume_score)}</span>
                  </div>
                  <Progress value={score.demand_volume_score} className="h-2" />
                </div>
                <p className="text-xs text-slate-500">
                  {score.total_demands} demandas no período
                </p>
              </CardContent>
            </Card>

            {/* Backlog */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm">Backlog</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Score</span>
                    <span className="font-semibold">{Math.round(score.backlog_score)}</span>
                  </div>
                  <Progress value={score.backlog_score} className="h-2" />
                </div>
                <p className="text-xs text-slate-500">
                  {score.open_demands_count} abertas, idade média {Math.round(score.average_backlog_age_days)}d
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Fatores Contribuintes */}
          {score.contributing_factors && score.contributing_factors.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Fatores que Impactam o Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {score.contributing_factors.map((factor, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="font-medium text-sm">{factor.factor_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{Math.round(factor.score)}</span>
                      <Badge className={
                        factor.impact_level === 'negative' ? 'bg-red-100 text-red-800' :
                        factor.impact_level === 'neutral' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }>
                        {factor.impact_level === 'negative' ? 'Crítico' : factor.impact_level === 'neutral' ? 'Atenção' : 'Bom'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}