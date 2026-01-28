import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SDRPerformanceReport({ filters }) {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads', filters],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: handoffs = [] } = useQuery({
    queryKey: ['handoffs', filters],
    queryFn: () => base44.entities.LeadHandoff.list(),
  });

  const performanceData = useMemo(() => {
    const sdrMap = new Map();

    // Agrupar leads por SDR responsável
    leads.forEach(lead => {
      if (lead.responsible_type === 'sdr' && lead.responsible_name) {
        if (!sdrMap.has(lead.responsible_id)) {
          sdrMap.set(lead.responsible_id, {
            id: lead.responsible_id,
            name: lead.responsible_name,
            leadsTotal: 0,
            leadsQualified: 0,
            handoffsCompleted: 0,
            conversionRate: 0,
            avgFit: []
          });
        }

        const sdr = sdrMap.get(lead.responsible_id);
        sdr.leadsTotal++;
        if (lead.pipeline_stage === 'qualificado' || lead.pipeline_stage === 'handoff') {
          sdr.leadsQualified++;
        }
        if (lead.qualification_fit) {
          sdr.avgFit.push(lead.qualification_fit);
        }
      }
    });

    // Contar handoffs por SDR
    handoffs.forEach(handoff => {
      if (sdrMap.has(handoff.from_user_id)) {
        const sdr = sdrMap.get(handoff.from_user_id);
        sdr.handoffsCompleted++;
      }
    });

    // Calcular taxas
    const result = Array.from(sdrMap.values()).map(sdr => ({
      ...sdr,
      conversionRate: sdr.leadsTotal > 0 ? ((sdr.leadsQualified / sdr.leadsTotal) * 100).toFixed(1) : 0,
      avgFitLevel: sdr.avgFit.length > 0 
        ? (sdr.avgFit.filter(f => f === 'alto').length / sdr.avgFit.length * 100).toFixed(1) 
        : 0
    }));

    return result.sort((a, b) => b.leadsQualified - a.leadsQualified);
  }, [leads, handoffs]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Total de SDRs</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">{performanceData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Leads Qualificados (Total)</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {performanceData.reduce((sum, sdr) => sum + sdr.leadsQualified, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Handoffs Realizados</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {performanceData.reduce((sum, sdr) => sum + sdr.handoffsCompleted, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por SDR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SDR</TableHead>
                  <TableHead className="text-right">Leads Total</TableHead>
                  <TableHead className="text-right">Qualificados</TableHead>
                  <TableHead className="text-right">Taxa Conversão</TableHead>
                  <TableHead className="text-right">Handoffs</TableHead>
                  <TableHead className="text-right">% Alto Fit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="6" className="text-center py-6 text-slate-500">
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                ) : (
                  performanceData.map((sdr) => (
                    <TableRow key={sdr.id}>
                      <TableCell className="font-medium">{sdr.name}</TableCell>
                      <TableCell className="text-right">{sdr.leadsTotal}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-blue-100 text-blue-800">{sdr.leadsQualified}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-[#355340]">{sdr.conversionRate}%</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-purple-100 text-purple-800">{sdr.handoffsCompleted}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{sdr.avgFitLevel}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}