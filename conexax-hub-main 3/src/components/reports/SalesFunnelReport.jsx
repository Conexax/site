import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function SalesFunnelReport({ filters }) {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads', filters],
    queryFn: () => base44.entities.Lead.list(),
  });

  const funnelData = useMemo(() => {
    const stages = ['captado', 'qualificado', 'handoff', 'fechado'];
    const stageLabels = {
      'captado': 'Captado',
      'qualificado': 'Qualificado',
      'handoff': 'Handoff',
      'fechado': 'Fechado'
    };

    const data = stages.map(stage => {
      const count = leads.filter(l => l.pipeline_stage === stage).length;
      return { stage, label: stageLabels[stage], count };
    });

    const total = leads.length;
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : 0,
      conversionRate: item.count > 0 ? '100%' : '0%'
    }));
  }, [leads]);

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => l.pipeline_stage === 'qualificado').length;
  const closedLeads = leads.filter(l => l.pipeline_stage === 'fechado').length;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Total de Leads</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">{totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Qualificados</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{qualifiedLeads}</div>
            <div className="text-xs text-slate-500 mt-2">
              {totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0}% do total
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Fechados</div>
            <div className="text-3xl font-bold text-emerald-600 mt-2">{closedLeads}</div>
            <div className="text-xs text-slate-500 mt-2">
              {totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : 0}% do total
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Taxa de Conversão</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{conversionRate}%</div>
            <div className="text-xs text-slate-500 mt-2">Captado → Fechado</div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Vendas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {funnelData.map((item, idx) => (
            <div key={item.stage}>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.count} leads ({item.percentage}%)</p>
                </div>
                <Badge variant="outline">{item.count}</Badge>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#355340] to-[#62997f] h-full flex items-center justify-end pr-3 text-xs font-semibold text-white transition-all"
                  style={{ width: `${item.percentage}%` }}
                >
                  {item.percentage > 5 && `${item.percentage}%`}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}