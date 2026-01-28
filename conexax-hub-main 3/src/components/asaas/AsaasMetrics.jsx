import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StatsCard from "@/components/ui/StatsCard";
import { DollarSign, Clock, AlertCircle, CheckCircle2, RefreshCw, TrendingDown } from "lucide-react";
import { subDays, format, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function AsaasMetrics() {
  const [dateRange, setDateRange] = useState("30");
  const queryClient = useQueryClient();

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ["asaasCharges"],
    queryFn: () => base44.entities.AsaasCharge.list("-created_date", 1000),
  });

  const { data: lastSyncJobs = [] } = useQuery({
    queryKey: ["lastSyncJobs"],
    queryFn: () => base44.entities.ProviderSyncJob.filter({ provider: "asaas" }, "-created_date", 5),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const days = parseInt(dateRange);
      const rangeStart = format(subDays(new Date(), days), "yyyy-MM-dd");
      const rangeEnd = format(new Date(), "yyyy-MM-dd");

      const response = await fetch(`/api/functions/sync-asaas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rangeStart, rangeEnd })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao sincronizar");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["asaasCharges"] });
      queryClient.invalidateQueries({ queryKey: ["lastSyncJobs"] });
      toast.success(`${data.processed} cobranças sincronizadas`);
    },
    onError: (error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  const filteredCharges = useMemo(() => {
    const days = parseInt(dateRange);
    const startDate = subDays(new Date(), days);
    
    return charges.filter(charge => {
      const chargeDate = parseISO(charge.created_date);
      return isWithinInterval(chargeDate, { start: startDate, end: new Date() });
    });
  }, [charges, dateRange]);

  const metrics = useMemo(() => {
    const received = filteredCharges
      .filter(c => c.status === "RECEIVED" || c.status === "CONFIRMED" || c.status === "RECEIVED_IN_CASH")
      .reduce((sum, c) => sum + c.amount, 0);
    
    const pending = filteredCharges
      .filter(c => c.status === "PENDING")
      .reduce((sum, c) => sum + c.amount, 0);
    
    const overdue = filteredCharges
      .filter(c => c.status === "OVERDUE")
      .reduce((sum, c) => sum + c.amount, 0);
    
    const refunded = filteredCharges
      .filter(c => c.status === "REFUNDED")
      .reduce((sum, c) => sum + c.amount, 0);

    const receivedCount = filteredCharges.filter(c => 
      c.status === "RECEIVED" || c.status === "CONFIRMED" || c.status === "RECEIVED_IN_CASH"
    ).length;

    const overdueCount = filteredCharges.filter(c => c.status === "OVERDUE").length;

    return { received, pending, overdue, refunded, receivedCount, overdueCount };
  }, [filteredCharges]);

  const lastSync = lastSyncJobs.find(job => job.status === "success");
  const hasSyncError = lastSyncJobs.some(job => job.status === "error");

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Métricas Asaas</h2>
          <p className="text-slate-600 mt-1">Acompanhe suas cobranças e recebimentos</p>
          {lastSync && (
            <p className="text-sm text-slate-500 mt-1">
              Última atualização: {format(new Date(lastSync.finishedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            variant="outline"
          >
            {syncMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </>
            )}
          </Button>
        </div>
      </div>

      {hasSyncError && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Erro na última sincronização. Tente atualizar novamente.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Recebido"
          value={`R$ ${metrics.received.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          subtitle={`${metrics.receivedCount} cobranças pagas`}
          icon={CheckCircle2}
          trend="up"
          trendValue=""
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Total Pendente"
          value={`R$ ${metrics.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          subtitle="Aguardando pagamento"
          icon={Clock}
          trend="neutral"
          trendValue=""
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Total Vencido"
          value={`R$ ${metrics.overdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          subtitle={`${metrics.overdueCount} cobranças vencidas`}
          icon={AlertCircle}
          trend="down"
          trendValue=""
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatsCard
          title="Total Reembolsado"
          value={`R$ ${metrics.refunded.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          subtitle="Valores estornados"
          icon={TrendingDown}
          trend="neutral"
          trendValue=""
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      {filteredCharges.length === 0 && !isLoading && (
        <Alert>
          <AlertDescription>
            Nenhuma cobrança encontrada para o período selecionado. Clique em "Atualizar" para sincronizar com o Asaas.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}