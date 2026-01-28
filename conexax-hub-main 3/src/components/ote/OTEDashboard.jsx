import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, TrendingUp, TrendingDown, DollarSign, Target, Zap, AlertTriangle, Eye } from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function OTEDashboard() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewingCalculation, setViewingCalculation] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const queryClient = useQueryClient();

  const { data: calculations = [], isLoading } = useQuery({
    queryKey: ["oteCalculations", period],
    queryFn: () => base44.entities.OTECalculation.filter({ period }),
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["commercialTeam"],
    queryFn: () => base44.entities.CommercialTeamMember.list(),
  });

  const handleCalculate = async (sellerId) => {
    setCalculating(true);
    try {
      await base44.functions.invoke('calculateOTE', { seller_id: sellerId, period });
      queryClient.invalidateQueries({ queryKey: ["oteCalculations"] });
      toast.success("OTE calculado!");
    } catch (error) {
      toast.error(`Erro ao calcular: ${error.message}`);
    } finally {
      setCalculating(false);
    }
  };

  const handleCalculateAll = async () => {
    setCalculating(true);
    for (const seller of sellers) {
      try {
        await base44.functions.invoke('calculateOTE', { seller_id: seller.id, period });
      } catch (error) {
        console.error(`Erro ao calcular OTE para ${seller.name}:`, error);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["oteCalculations"] });
    toast.success("OTE calculado para todos!");
    setCalculating(false);
  };

  const filteredCalculations = selectedSeller === "all" 
    ? calculations 
    : calculations.filter(c => c.seller_id === selectedSeller);

  const totalOTEExpected = filteredCalculations.reduce((sum, c) => sum + (c.ote_expected || 0), 0);
  const totalOTERealized = filteredCalculations.reduce((sum, c) => sum + (c.ote_realized || 0), 0);
  const totalDifference = totalOTERealized - totalOTEExpected;
  const totalPenalties = filteredCalculations.reduce((sum, c) => sum + (c.penalties_total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard OTE</h2>
          <p className="text-sm text-slate-500">On-Target Earnings por vendedor</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-40"
          />
          <Select value={selectedSeller} onValueChange={setSelectedSeller}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Vendedores</SelectItem>
              {sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleCalculateAll}
            disabled={calculating}
            className="bg-[#355340] hover:bg-[#355340]/90"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {calculating ? "Calculando..." : "Calcular Todos"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="OTE Esperado" 
          value={`R$ ${totalOTEExpected.toLocaleString('pt-BR')}`} 
          icon={Target} 
        />
        <StatsCard 
          title="OTE Realizado" 
          value={`R$ ${totalOTERealized.toLocaleString('pt-BR')}`} 
          icon={DollarSign}
          iconClassName={totalOTERealized >= totalOTEExpected ? "bg-emerald-500" : "bg-amber-500"}
        />
        <StatsCard 
          title="Diferença" 
          value={`R$ ${totalDifference.toLocaleString('pt-BR')}`} 
          icon={totalDifference >= 0 ? TrendingUp : TrendingDown}
          iconClassName={totalDifference >= 0 ? "bg-green-500" : "bg-red-500"}
        />
        <StatsCard 
          title="Penalidades" 
          value={`R$ ${totalPenalties.toLocaleString('pt-BR')}`} 
          icon={AlertTriangle}
          iconClassName="bg-red-500"
        />
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredCalculations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Calculator className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>Nenhum cálculo encontrado para este período</p>
              <p className="text-sm mt-1">Clique em "Calcular Todos" para processar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>MRR Vendido</TableHead>
                    <TableHead>% Meta</TableHead>
                    <TableHead>Fixa</TableHead>
                    <TableHead>Variável</TableHead>
                    <TableHead>Acelerador</TableHead>
                    <TableHead>Penalidades</TableHead>
                    <TableHead>OTE Realizado</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalculations.map((calc) => (
                    <TableRow key={calc.id}>
                      <TableCell className="font-medium">{calc.seller_name}</TableCell>
                      <TableCell>R$ {calc.mrr_sold?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge className={
                          calc.target_achievement_percentage >= 100 ? "bg-emerald-100 text-emerald-800" :
                          calc.target_achievement_percentage >= 80 ? "bg-amber-100 text-amber-800" :
                          "bg-red-100 text-red-800"
                        }>
                          {calc.target_achievement_percentage?.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {calc.fixed_commission?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>R$ {calc.variable_commission_final?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        {calc.accelerator_applied > 1 ? (
                          <Badge className="bg-green-100 text-green-800">
                            {calc.accelerator_applied}x
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {calc.penalties_total > 0 ? (
                          <span className="text-red-600 font-medium">
                            -R$ {calc.penalties_total?.toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        R$ {calc.ote_realized?.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setViewingCalculation(calc);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes OTE - {viewingCalculation?.seller_name}</DialogTitle>
          </DialogHeader>
          {viewingCalculation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Período</p>
                  <p className="font-semibold">{viewingCalculation.period}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Meta Mensal</p>
                  <p className="font-semibold">R$ {viewingCalculation.monthly_target?.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">MRR Vendido</p>
                  <p className="font-semibold text-[#355340]">R$ {viewingCalculation.mrr_sold?.toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Composição do OTE</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Comissão Fixa</span>
                    <span className="font-medium">R$ {viewingCalculation.fixed_commission?.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Comissão Variável Base</span>
                    <span className="font-medium">R$ {viewingCalculation.variable_commission_base?.toLocaleString('pt-BR')}</span>
                  </div>
                  {viewingCalculation.accelerator_applied > 1 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Acelerador ({viewingCalculation.accelerator_applied}x)</span>
                      <span className="font-medium">
                        +R$ {(viewingCalculation.variable_commission_final - viewingCalculation.variable_commission_base).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {viewingCalculation.penalties_total > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Penalidades</span>
                      <span className="font-medium">-R$ {viewingCalculation.penalties_total?.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-semibold text-base">
                    <span>OTE Realizado</span>
                    <span className="text-[#355340]">R$ {viewingCalculation.ote_realized?.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {viewingCalculation.penalties_applied?.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Penalidades por Churn Precoce
                  </h3>
                  <div className="space-y-2">
                    {viewingCalculation.penalties_applied.map((penalty, idx) => (
                      <div key={idx} className="bg-red-50 p-3 rounded-lg text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-slate-900">{penalty.client_name}</p>
                            <p className="text-xs text-slate-500 mt-1">{penalty.reason}</p>
                          </div>
                          <span className="text-red-600 font-semibold">
                            -R$ {penalty.penalty_amount?.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingCalculation.contracts_included?.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Contratos Incluídos</h3>
                  <p className="text-sm text-slate-500">{viewingCalculation.contracts_included.length} contrato(s) considerado(s) no cálculo</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}