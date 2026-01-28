import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClientRetentionReport({ filters }) {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: healthScores = [] } = useQuery({
    queryKey: ['health-scores', filters],
    queryFn: async () => {
      try {
        return await base44.entities.ClientHealthScore.list();
      } catch {
        return [];
      }
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', filters],
    queryFn: async () => {
      try {
        return await base44.entities.Contract.list();
      } catch {
        return [];
      }
    },
  });

  const retentionData = useMemo(() => {
    const healthMap = new Map(healthScores.map(h => [h.client_id, h]));
    
    return clients.map(client => {
      const health = healthMap.get(client.id);
      const clientContracts = contracts.filter(c => c.client_id === client.id);
      const totalMRR = clientContracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);

      return {
        id: client.id,
        name: client.company_name,
        status: client.status,
        churnScore: client.churn_score || 0,
        churnStatus: client.churn_status || 'healthy',
        healthScore: health?.overall_score || 0,
        healthStatus: health?.health_status || 'healthy',
        totalMRR: totalMRR.toFixed(2),
        contractsCount: clientContracts.length
      };
    });
  }, [clients, healthScores, contracts]);

  const healthyCount = retentionData.filter(c => c.churnStatus === 'healthy').length;
  const attentionCount = retentionData.filter(c => c.churnStatus === 'attention').length;
  const riskCount = retentionData.filter(c => c.churnStatus === 'risk').length;
  const totalMRRSum = retentionData.reduce((sum, c) => sum + parseFloat(c.totalMRR || 0), 0);

  const getChurnStatusColor = (status) => {
    switch(status) {
      case 'healthy':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'attention':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'risk':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getHealthStatusLabel = (status) => {
    switch(status) {
      case 'healthy': return 'Saudável';
      case 'at_risk': return 'Em Risco';
      case 'critical': return 'Crítico';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Total de Clientes</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">{clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Clientes Saudáveis</div>
            <div className="text-3xl font-bold text-emerald-600 mt-2">{healthyCount}</div>
            <div className="text-xs text-slate-500 mt-2">
              {clients.length > 0 ? ((healthyCount / clients.length) * 100).toFixed(0) : 0}% do total
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">Atenção Necessária</div>
            <div className="text-3xl font-bold text-amber-600 mt-2">{attentionCount}</div>
            <div className="text-xs text-slate-500 mt-2">Monitorar ativamente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 font-medium">MRR Total</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              R$ {totalMRRSum.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alert */}
      {riskCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">{riskCount} cliente(s) em risco crítico</p>
              <p className="text-sm text-red-700 mt-1">Recomenda-se ação imediata para retenção</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retention Table */}
      <Card>
        <CardHeader>
          <CardTitle>Status de Retenção por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">Contratos</TableHead>
                  <TableHead>Status de Churn</TableHead>
                  <TableHead>Health Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retentionData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="5" className="text-center py-6 text-slate-500">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  retentionData.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-right">
                        R$ {parseFloat(client.totalMRR).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">{client.contractsCount}</TableCell>
                      <TableCell>
                        <Badge className={`border ${getChurnStatusColor(client.churnStatus)}`}>
                          {client.churnStatus === 'healthy' ? 'Saudável' :
                           client.churnStatus === 'attention' ? 'Atenção' :
                           'Risco'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 w-24">
                            <div
                              className="bg-gradient-to-r from-[#355340] to-[#62997f] h-full rounded-full"
                              style={{ width: `${client.healthScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{client.healthScore}</span>
                        </div>
                      </TableCell>
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