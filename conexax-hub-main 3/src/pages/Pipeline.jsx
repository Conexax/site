import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  Users,
  Filter,
  ArrowUpDown,
  Clock,
  FileText,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/ui/StatusBadge";
import ChurnIndicator from "@/components/clients/ChurnIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import StatsCard from "@/components/ui/StatsCard";
import PipelineVisual from "@/components/crm/PipelineVisual";
import { AuditPageView } from "@/components/audit/AuditLogger";

export default function Pipeline() {
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [churnFilter, setChurnFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent_activity");

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 500),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date", 500),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.Activity.list("-updated_date", 1000),
  });

  // Enriquecer clientes com dados relacionados
  const enrichedClients = useMemo(() => {
    return clients.map(client => {
      const clientContracts = contracts.filter(c => c.client_id === client.id);
      const clientActivities = activities.filter(a => a.client_id === client.id);
      
      const activeContract = clientContracts.find(c => c.status === 'active');
      const lastActivity = clientActivities[0];
      
      const lastActivityDate = lastActivity 
        ? new Date(lastActivity.updated_date)
        : null;

      const daysSinceActivity = lastActivityDate
        ? Math.floor((new Date() - lastActivityDate) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        ...client,
        activeContract,
        totalContracts: clientContracts.length,
        recentActivities: clientActivities.slice(0, 3),
        lastActivityDate,
        daysSinceActivity
      };
    });
  }, [clients, contracts, activities]);

  // Filtrar clientes
  const filteredClients = useMemo(() => {
    let filtered = enrichedClients.filter(client => {
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const matchesResponsible = responsibleFilter === "all" || client.internal_responsible_id === responsibleFilter;
      const matchesChurn = churnFilter === "all" || client.churn_status === churnFilter;
      
      return matchesStatus && matchesResponsible && matchesChurn;
    });

    // Ordenar
    filtered.sort((a, b) => {
      if (sortBy === "recent_activity") {
        return a.daysSinceActivity - b.daysSinceActivity;
      } else if (sortBy === "churn_risk") {
        return (b.churn_score || 0) - (a.churn_score || 0);
      } else if (sortBy === "contract_value") {
        return (b.activeContract?.monthly_value || 0) - (a.activeContract?.monthly_value || 0);
      }
      return 0;
    });

    return filtered;
  }, [enrichedClients, statusFilter, responsibleFilter, churnFilter, sortBy]);

  const getResponsibleName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || "Não atribuído";
  };

  // Estatísticas
  const stats = useMemo(() => {
    const total = filteredClients.length;
    const healthyCount = filteredClients.filter(c => c.churn_status === "healthy").length;
    const attentionCount = filteredClients.filter(c => c.churn_status === "attention").length;
    const riskCount = filteredClients.filter(c => c.churn_status === "risk").length;
    const totalMRR = filteredClients.reduce((sum, c) => sum + (c.activeContract?.monthly_value || 0), 0);

    return { total, healthyCount, attentionCount, riskCount, totalMRR };
  }, [filteredClients]);

  const isLoading = loadingClients;

  return (
    <>
      <AuditPageView pageName="Pipeline" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pipeline CRM</h1>
        <p className="text-slate-500 text-sm mt-1">Visão consolidada da carteira ativa</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Total de Contas" value={stats.total} icon={Building2} />
        <StatsCard title="Saudáveis" value={stats.healthyCount} icon={Building2} iconClassName="bg-emerald-500" />
        <StatsCard title="Atenção" value={stats.attentionCount} icon={Building2} iconClassName="bg-yellow-500" />
        <StatsCard title="Risco" value={stats.riskCount} icon={Building2} iconClassName="bg-red-500" />
        <StatsCard 
          title="MRR Total" 
          value={`R$ ${(stats.totalMRR / 1000).toFixed(0)}k`} 
          icon={FileText} 
          iconClassName="bg-[#355340]" 
        />
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={churnFilter} onValueChange={setChurnFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Saúde" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Saúdes</SelectItem>
                <SelectItem value="healthy">Saudável</SelectItem>
                <SelectItem value="attention">Atenção</SelectItem>
                <SelectItem value="risk">Risco</SelectItem>
              </SelectContent>
            </Select>

            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Responsáveis</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent_activity">Atividade Recente</SelectItem>
                <SelectItem value="churn_risk">Risco de Churn</SelectItem>
                <SelectItem value="contract_value">Valor do Contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Visual */}
      <PipelineVisual entityType="lead" data={filteredClients} />

      {/* Pipeline Cards */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </>
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma conta encontrada"
            description="Ajuste os filtros ou adicione novos clientes"
          />
        ) : (
          filteredClients.map(client => (
            <Card key={client.id} className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Info Principal */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#62997f]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-[#355340] font-bold text-lg">
                          {client.company_name?.charAt(0) || "C"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900">{client.company_name}</h3>
                          <StatusBadge status={client.status} />
                          <ChurnIndicator client={client} showDetails={true} size="sm" />
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{client.segment || "Sem segmento"}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {getResponsibleName(client.internal_responsible_id)}
                          </span>
                          {client.lastActivityDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {client.daysSinceActivity === 0 ? "Hoje" : `${client.daysSinceActivity}d atrás`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contrato */}
                  <div className="flex-shrink-0 lg:w-48">
                    <div className="text-sm">
                      <p className="text-xs text-slate-500 mb-1">Contrato Ativo</p>
                      {client.activeContract ? (
                        <div>
                          <p className="font-semibold text-[#355340]">
                            R$ {client.activeContract.monthly_value?.toLocaleString('pt-BR')}/mês
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {client.totalContracts} contrato{client.totalContracts !== 1 ? 's' : ''} total
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Sem contrato ativo</p>
                      )}
                    </div>
                  </div>

                  {/* Atividades Recentes */}
                  <div className="flex-shrink-0 lg:w-64">
                    <div className="text-sm">
                      <p className="text-xs text-slate-500 mb-1">Atividades Recentes</p>
                      {client.recentActivities.length > 0 ? (
                        <div className="space-y-1">
                          {client.recentActivities.slice(0, 2).map(activity => (
                            <div key={activity.id} className="text-xs text-slate-600 truncate">
                              • {activity.title}
                            </div>
                          ))}
                          {client.recentActivities.length > 2 && (
                            <p className="text-xs text-slate-400">
                              +{client.recentActivities.length - 2} mais
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Nenhuma atividade recente</p>
                      )}
                    </div>
                  </div>

                  {/* Ver Detalhes */}
                  <div className="flex-shrink-0">
                    <Link to={createPageUrl(`ClientDetail?id=${client.id}`)}>
                      <Button variant="outline" size="sm" className="w-full lg:w-auto">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
    </>
  );
}