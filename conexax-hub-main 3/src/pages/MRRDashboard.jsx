import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, DollarSign, Users, Receipt, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

const calculateMRR = (contracts) => {
  return contracts
    .filter(c => c.status === 'active')
    .reduce((total, contract) => {
      const monthlyValue = contract.monthly_value || 0;
      return total + monthlyValue;
    }, 0);
};

const getNewMRR = (contracts, currentMonth) => {
  const [year, month] = currentMonth.split('-').map(Number);
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  
  return contracts
    .filter(c => {
      if (!c.start_date || c.status !== 'active') return false;
      const startDate = new Date(c.start_date);
      return startDate >= startOfMonth && startDate <= endOfMonth;
    })
    .reduce((total, c) => total + (c.monthly_value || 0), 0);
};

const getChurnedMRR = (contracts, currentMonth) => {
  const [year, month] = currentMonth.split('-').map(Number);
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  
  return contracts
    .filter(c => {
      if (c.status !== 'cancelled' && c.status !== 'ended') return false;
      if (!c.end_date) return false;
      const endDate = new Date(c.end_date);
      return endDate >= startOfMonth && endDate <= endOfMonth;
    })
    .reduce((total, c) => total + (c.monthly_value || 0), 0);
};

const getExpansionMRR = (contracts, currentMonth) => {
  const [year, month] = currentMonth.split('-').map(Number);
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  
  return contracts
    .filter(c => {
      if (!c.updated_date || c.status !== 'active') return false;
      const updatedDate = new Date(c.updated_date);
      const startDate = new Date(c.start_date);
      return updatedDate >= startOfMonth && updatedDate <= endOfMonth && updatedDate > startDate;
    })
    .reduce((total, c) => {
      return total + Math.max(0, (c.monthly_value || 0) * 0.1);
    }, 0);
};

const getMRRByMonth = (contracts) => {
  const mrrByMonth = {};
  const today = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    
    const activeContracts = contracts.filter(c => {
      if (!c.start_date) return false;
      const startDate = new Date(c.start_date);
      const endDate = c.end_date ? new Date(c.end_date) : null;
      
      return startDate <= date && (!endDate || endDate >= date) && c.status === 'active';
    });
    
    mrrByMonth[yearMonth] = {
      month: monthLabel,
      mrr: calculateMRR(activeContracts),
      clients: activeContracts.length
    };
  }
  
  return Object.values(mrrByMonth);
};

const getMRRByPlan = (contracts) => {
  const mrrByPlan = {};
  
  contracts
    .filter(c => c.status === 'active')
    .forEach(contract => {
      const plan = contract.plan || 'Sem plano';
      if (!mrrByPlan[plan]) {
        mrrByPlan[plan] = { plan, mrr: 0, count: 0 };
      }
      mrrByPlan[plan].mrr += contract.monthly_value || 0;
      mrrByPlan[plan].count += 1;
    });
  
  return Object.values(mrrByPlan).sort((a, b) => b.mrr - a.mrr);
};

export default function MRRDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts-mrr'],
    queryFn: () => base44.entities.Contract.list()
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-mrr'],
    queryFn: () => base44.entities.Client.list()
  });

  const mrrData = useMemo(() => {
    const currentMRR = calculateMRR(contracts);
    const activeClients = contracts.filter(c => c.status === 'active').length;
    const avgTicket = activeClients > 0 ? currentMRR / activeClients : 0;
    
    const monthlyData = getMRRByMonth(contracts);
    const previousMonthMRR = monthlyData[monthlyData.length - 2]?.mrr || 0;
    const mrrChange = currentMRR - previousMonthMRR;
    const mrrChangePercent = previousMonthMRR > 0 ? ((mrrChange / previousMonthMRR) * 100) : 0;
    
    const planData = getMRRByPlan(contracts);
    
    const newMRR = getNewMRR(contracts, selectedMonth);
    const churnedMRR = getChurnedMRR(contracts, selectedMonth);
    const expansionMRR = getExpansionMRR(contracts, selectedMonth);
    
    return {
      currentMRR,
      previousMonthMRR,
      mrrChange,
      mrrChangePercent,
      activeClients,
      avgTicket,
      monthlyData,
      planData,
      newMRR,
      churnedMRR,
      expansionMRR
    };
  }, [contracts, selectedMonth]);

  const isLoading = loadingContracts || loadingClients;

  const availableMonths = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      });
    }
    return months;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-[#355340]" />
              Dashboard de MRR
            </h1>
            <p className="text-slate-500 mt-1">
              Receita Recorrente Mensal - Visão completa e atualizada
            </p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Metrics */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-slate-200">
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* MRR Total */}
            <Card className="border-slate-200 bg-gradient-to-br from-[#355340] to-[#62997f] text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white/80">MRR Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {formatCurrency(mrrData.currentMRR)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {mrrData.mrrChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-300" />
                  )}
                  <span className={mrrData.mrrChange >= 0 ? "text-emerald-300" : "text-red-300"}>
                    {mrrData.mrrChangePercent >= 0 ? '+' : ''}{mrrData.mrrChangePercent.toFixed(1)}%
                  </span>
                  <span className="text-white/70">MoM</span>
                </div>
              </CardContent>
            </Card>

            {/* New MRR */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">MRR Novo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-emerald-600">
                  +{formatCurrency(mrrData.newMRR)}
                </div>
                <p className="text-sm text-slate-500">
                  Novos contratos do mês
                </p>
              </CardContent>
            </Card>

            {/* Churned MRR */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">MRR Churnado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-red-600">
                  -{formatCurrency(mrrData.churnedMRR)}
                </div>
                <p className="text-sm text-slate-500">
                  Contratos cancelados
                </p>
              </CardContent>
            </Card>

            {/* Expansion MRR */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">MRR Expansão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-blue-600">
                  +{formatCurrency(mrrData.expansionMRR)}
                </div>
                <p className="text-sm text-slate-500">
                  Upgrades e aumentos
                </p>
              </CardContent>
            </Card>

            {/* Crescimento MoM */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Crescimento MoM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold mb-2 ${mrrData.mrrChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {mrrData.mrrChange >= 0 ? '+' : ''}{mrrData.mrrChangePercent.toFixed(1)}%
                </div>
                <p className="text-sm text-slate-500">
                  {formatCurrency(Math.abs(mrrData.mrrChange))} vs anterior
                </p>
              </CardContent>
            </Card>

            {/* ARPA */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">ARPA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-slate-900">
                  {formatCurrency(mrrData.avgTicket)}
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-500">{mrrData.activeClients} clientes ativos</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MRR Evolution Chart */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Evolução do MRR - Últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={mrrData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mrr" 
                    stroke="#355340" 
                    strokeWidth={3}
                    dot={{ fill: '#355340', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="MRR"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* MRR by Plan */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">MRR por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : mrrData.planData.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum plano ativo no momento</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mrrData.planData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="plan" 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="mrr" fill="#355340" radius={[8, 8, 0, 0]} name="MRR" />
                  </BarChart>
                </ResponsiveContainer>
                
                <div className="mt-6 space-y-2">
                  {mrrData.planData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-[#355340]" />
                        <span className="font-medium text-slate-900">{item.plan}</span>
                        <span className="text-sm text-slate-500">({item.count} {item.count === 1 ? 'cliente' : 'clientes'})</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.mrr)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-sm text-slate-600">MRR Atual</span>
                <span className="font-semibold text-slate-900">{formatCurrency(mrrData.currentMRR)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-sm text-slate-600">MRR Mês Anterior</span>
                <span className="font-semibold text-slate-900">{formatCurrency(mrrData.previousMonthMRR)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-sm text-slate-600">Crescimento</span>
                <span className={`font-semibold ${mrrData.mrrChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {mrrData.mrrChange >= 0 ? '+' : ''}{formatCurrency(mrrData.mrrChange)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">MRR Anual Projetado</span>
                <span className="font-semibold text-slate-900">{formatCurrency(mrrData.currentMRR * 12)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Indicadores de Saúde</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-sm text-slate-600">Clientes Ativos</span>
                <span className="font-semibold text-slate-900">{mrrData.activeClients}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-sm text-slate-600">Ticket Médio</span>
                <span className="font-semibold text-slate-900">{formatCurrency(mrrData.avgTicket)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-sm text-slate-600">Taxa de Crescimento</span>
                <span className={`font-semibold ${mrrData.mrrChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {mrrData.mrrChangePercent >= 0 ? '+' : ''}{mrrData.mrrChangePercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status Geral</span>
                <span className={`font-semibold ${mrrData.mrrChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {mrrData.mrrChange >= 0 ? 'Crescimento' : 'Queda'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}