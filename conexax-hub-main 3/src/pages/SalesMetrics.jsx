import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StatsCard from "../components/ui/StatsCard";
import { DollarSign, ShoppingCart, TrendingUp, RotateCcw, RefreshCw, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899"];

export default function SalesMetrics() {
  const [dateRange, setDateRange] = useState("30");
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 1000),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["checkoutConnections"],
    queryFn: () => base44.entities.CheckoutProviderConnection.list(),
  });

  const { data: lastSyncJobs = [] } = useQuery({
    queryKey: ["lastSyncJobs"],
    queryFn: () => base44.entities.ProviderSyncJob.list("-created_date", 10),
  });

  const syncMutation = useMutation({
    mutationFn: async (provider) => {
      const days = parseInt(dateRange);
      const rangeStart = format(subDays(new Date(), days), "yyyy-MM-dd");
      const rangeEnd = format(new Date(), "yyyy-MM-dd");

      const response = await fetch(`/api/functions/sync-${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rangeStart, rangeEnd })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao sincronizar");
      }

      return data;
    },
    onSuccess: (data, provider) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["lastSyncJobs"] });
      toast.success(`${data.processed} pedidos sincronizados de ${provider}`);
    },
    onError: (error) => {
      toast.error(`Não foi possível atualizar agora. ${error.message}`);
    },
  });

  const handleSyncAll = async () => {
    const connectedProviders = connections
      .filter(c => c.isConnected)
      .map(c => c.provider);

    if (connectedProviders.length === 0) {
      toast.error("Nenhum provedor conectado");
      return;
    }

    for (const provider of connectedProviders) {
      await syncMutation.mutateAsync(provider);
    }
  };

  const lastSync = lastSyncJobs.find(job => job.status === "success");
  const hasSyncError = lastSyncJobs.some(job => job.status === "error");

  const filteredOrders = useMemo(() => {
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days));
    return orders.filter(order => new Date(order.created_date) >= startDate);
  }, [orders, dateRange]);

  const metrics = useMemo(() => {
    const paidOrders = filteredOrders.filter(o => o.status === "pago");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);
    const refundedOrders = filteredOrders.filter(o => o.status === "reembolsado");
    const totalRefunded = refundedOrders.reduce((sum, o) => sum + o.amount, 0);
    const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    return {
      totalRevenue,
      paidOrdersCount: paidOrders.length,
      avgTicket,
      refundedCount: refundedOrders.length,
      totalRefunded
    };
  }, [filteredOrders]);

  const revenueByDay = useMemo(() => {
    const days = parseInt(dateRange);
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayOrders = filteredOrders.filter(o => {
        const orderDate = new Date(o.created_date);
        return orderDate >= dayStart && orderDate <= dayEnd && o.status === "pago";
      });
      const revenue = dayOrders.reduce((sum, o) => sum + o.amount, 0);
      data.push({
        date: format(date, "dd/MM", { locale: ptBR }),
        revenue
      });
    }
    return data;
  }, [filteredOrders, dateRange]);

  const ordersByStatus = useMemo(() => {
    const statusCounts = {};
    filteredOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    const labels = {
      pago: "Pagos",
      pendente: "Pendentes",
      cancelado: "Cancelados",
      reembolsado: "Reembolsados"
    };
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: labels[status] || status,
      value: count
    }));
  }, [filteredOrders]);

  const revenueByProvider = useMemo(() => {
    const providerRevenue = {};
    filteredOrders.filter(o => o.status === "pago").forEach(order => {
      providerRevenue[order.provider] = (providerRevenue[order.provider] || 0) + order.amount;
    });
    const labels = {
      yampi: "Yampi",
      shopify: "Shopify",
      kiwify: "Kiwify"
    };
    return Object.entries(providerRevenue).map(([provider, revenue]) => ({
      name: labels[provider] || provider,
      revenue
    }));
  }, [filteredOrders]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Métricas de Vendas</h1>
            <p className="text-slate-600 mt-1">Acompanhe o desempenho das suas vendas</p>
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
                <SelectItem value="1">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleSyncAll}
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
                  Atualizar métricas
                </>
              )}
            </Button>
          </div>
        </div>

        {hasSyncError && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Alguns provedores apresentaram erro na última sincronização. Tente atualizar novamente.
            </AlertDescription>
          </Alert>
        )}

        {filteredOrders.length === 0 && (
          <Alert>
            <AlertDescription>
              Nenhum dado disponível para o período selecionado.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Faturamento Total"
            value={`R$ ${metrics.totalRevenue.toFixed(2)}`}
            icon={DollarSign}
          />
          <StatsCard
            title="Pedidos Pagos"
            value={metrics.paidOrdersCount.toString()}
            icon={ShoppingCart}
          />
          <StatsCard
            title="Ticket Médio"
            value={`R$ ${metrics.avgTicket.toFixed(2)}`}
            icon={TrendingUp}
          />
          <StatsCard
            title="Reembolsos"
            value={metrics.refundedCount.toString()}
            subtitle={`R$ ${metrics.totalRefunded.toFixed(2)}`}
            icon={RotateCcw}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {revenueByProvider.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Provedor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByProvider}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}