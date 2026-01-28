import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AuditPageView } from "@/components/audit/AuditLogger";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatDate = (date) => {
  if (!date) return "";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};

const formatDateTime = (date) => {
  if (!date) return "";
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Zap
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CRMDashboard from "@/components/crm/CRMDashboard";

export default function Dashboard() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 100),
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.Activity.list("-created_date", 100),
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date", 100),
  });

  const { data: commercialTeam = [] } = useQuery({
    queryKey: ["commercialTeam"],
    queryFn: () => base44.entities.CommercialTeamMember.list(),
  });

  const activeClients = clients.filter(c => c.status === "active").length;
  const activeContracts = contracts.filter(c => c.status === "active").length;
  const pendingActivities = activities.filter(a => a.status === "pending" || a.status === "in_progress").length;
  const overdueActivities = activities.filter(a => a.status === "overdue").length;
  const monthlyRevenue = contracts
    .filter(c => c.status === "active")
    .reduce((sum, c) => sum + (c.monthly_value || 0), 0);

  const recentActivities = activities.slice(0, 5);
  const recentClients = clients.slice(0, 5);

  const isLoading = loadingClients || loadingActivities || loadingContracts;

  return (
    <>
      <AuditPageView pageName="Dashboard" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Visão geral da ConexaX • {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <Link to={createPageUrl("ClientRegistration")}>
          <Button className="bg-[#355340] hover:bg-[#355340]/90">
            Novo Cliente
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Clientes Ativos"
            value={activeClients}
            subtitle={`${clients.length} total`}
            icon={Building2}
          />
          <StatsCard
            title="Contratos Ativos"
            value={activeContracts}
            subtitle={`R$ ${monthlyRevenue.toLocaleString("pt-BR")} /mês`}
            icon={FileText}
            iconClassName="bg-emerald-500"
          />
          <StatsCard
            title="Atividades Pendentes"
            value={pendingActivities}
            subtitle={overdueActivities > 0 ? `${overdueActivities} atrasadas` : "Nenhuma atrasada"}
            icon={Zap}
            iconClassName="bg-amber-500"
          />
          <StatsCard
            title="Equipe Comercial"
            value={commercialTeam.length}
            subtitle="Vendedores ativos"
            icon={Users}
            iconClassName="bg-blue-500"
          />
        </div>
      )}

      {/* CRM Dashboard */}
      <CRMDashboard />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Atividades Recentes</CardTitle>
            <Link to={createPageUrl("Activities")}>
              <Button variant="ghost" size="sm" className="text-[#355340] hover:text-[#355340]/80">
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingActivities ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Zap className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Nenhuma atividade registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${
                      activity.status === "overdue" ? "bg-red-100" :
                      activity.status === "completed" ? "bg-emerald-100" :
                      activity.status === "in_progress" ? "bg-blue-100" : "bg-slate-200"
                    }`}>
                      {activity.status === "overdue" ? (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      ) : activity.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{activity.title}</p>
                      <p className="text-xs text-slate-500">
                        {activity.due_date && formatDate(activity.due_date)}
                      </p>
                    </div>
                    <StatusBadge status={activity.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Clientes Recentes</CardTitle>
            <Link to={createPageUrl("Clients")}>
              <Button variant="ghost" size="sm" className="text-[#355340] hover:text-[#355340]/80">
                Ver todos <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingClients ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : recentClients.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Nenhum cliente cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <Link 
                    key={client.id} 
                    to={createPageUrl(`ClientDetail?id=${client.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-[#62997f]/20 rounded-lg flex items-center justify-center">
                      <span className="text-[#355340] font-semibold text-sm">
                        {client.company_name?.charAt(0) || "C"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{client.company_name}</p>
                      <p className="text-xs text-slate-500">{client.segment || "Sem segmento"}</p>
                    </div>
                    <StatusBadge status={client.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to={createPageUrl("ClientRegistration")}>
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Building2 className="h-5 w-5 text-[#355340]" />
                <span className="text-xs">Novo Cliente</span>
              </Button>
            </Link>
            <Link to={createPageUrl("Activities")}>
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                <span className="text-xs">Nova Atividade</span>
              </Button>
            </Link>
            <Link to={createPageUrl("Contracts")}>
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <span className="text-xs">Novo Contrato</span>
              </Button>
            </Link>
            <Link to={createPageUrl("Metrics")}>
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-xs">Ver Métricas</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}