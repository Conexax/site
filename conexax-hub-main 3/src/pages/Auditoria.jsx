import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Shield,
  Filter,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AuditPageView } from "@/components/audit/AuditLogger";

const actionLabels = {
  LOGIN: "Login",
  LOGOUT: "Logout",
  LOGIN_FAILED: "Falha no Login",
  CHANGE_PASSWORD: "Alteração de Senha",
  ENABLE_2FA: "Ativação 2FA",
  DISABLE_2FA: "Desativação 2FA",
  CREATE_USER: "Criação de Usuário",
  UPDATE_USER: "Edição de Usuário",
  DELETE_USER: "Remoção de Usuário",
  INVITE_USER: "Convite de Usuário",
  CREATE_CLIENT: "Criação de Cliente",
  UPDATE_CLIENT: "Edição de Cliente",
  DELETE_CLIENT: "Remoção de Cliente",
  CREATE_CONTRACT: "Criação de Contrato",
  UPDATE_CONTRACT: "Edição de Contrato",
  DELETE_CONTRACT: "Remoção de Contrato",
  CREATE_PLAN: "Criação de Plano",
  UPDATE_PLAN: "Edição de Plano",
  DELETE_PLAN: "Remoção de Plano",
  CREATE_SQUAD: "Criação de Squad",
  UPDATE_SQUAD: "Edição de Squad",
  DELETE_SQUAD: "Remoção de Squad",
  ASSIGN_ACCOUNT: "Atribuição de Conta",
  CREATE_AUTOMATION: "Criação de Automação",
  UPDATE_AUTOMATION: "Edição de Automação",
  DELETE_AUTOMATION: "Remoção de Automação",
  CREATE_INTEGRATION: "Criação de Integração",
  UPDATE_INTEGRATION: "Edição de Integração",
  DELETE_INTEGRATION: "Remoção de Integração",
  UPDATE_COMMISSION: "Alteração de Comissão",
  CREATE_PAYMENT: "Criação de Pagamento",
  UPDATE_PAYMENT: "Edição de Pagamento",
  DELETE_PAYMENT: "Remoção de Pagamento",
  VIEW_PAGE: "Visualização de Página",
  CREATE_LEAD: "Criação de Lead",
  UPDATE_LEAD: "Edição de Lead",
  DELETE_LEAD: "Remoção de Lead",
  CREATE_ACTIVITY: "Criação de Atividade",
  UPDATE_ACTIVITY: "Edição de Atividade",
  DELETE_ACTIVITY: "Remoção de Atividade",
  CREATE_COMMERCIALTEAMMEMBER: "Criação de Vendedor",
  UPDATE_COMMERCIALTEAMMEMBER: "Edição de Vendedor",
  DELETE_COMMERCIALTEAMMEMBER: "Remoção de Vendedor",
  CREATE_OPERATIONALTEAMMEMBER: "Criação de Membro Operacional",
  UPDATE_OPERATIONALTEAMMEMBER: "Edição de Membro Operacional",
  DELETE_OPERATIONALTEAMMEMBER: "Remoção de Membro Operacional",
  CREATE_SQUADHISTORY: "Movimentação de Squad",
  UPDATE_SQUADHISTORY: "Atualização de Histórico",
  DELETE_SQUADHISTORY: "Remoção de Histórico",
  CREATE_COMMISSIONPAYMENT: "Criação de Pagamento de Comissão",
  UPDATE_COMMISSIONPAYMENT: "Edição de Pagamento de Comissão",
  DELETE_COMMISSIONPAYMENT: "Remoção de Pagamento de Comissão",
  OTHER: "Outra Ação"
};

const getActionLabel = (action) => {
  return actionLabels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function Auditoria() {
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [selectedResult, setSelectedResult] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const result = await base44.entities.AuditLog.list("-timestamp", 1000);
      return result || [];
    },
    enabled: user?.role === "admin" || user?.role === "financeiro" || user?.role === "seguranca",
    refetchInterval: 5000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === "admin" || user?.role === "financeiro" || user?.role === "seguranca",
  });

  const getDateRange = () => {
    const today = new Date();
    if (selectedPeriod === "7days") return { start: subDays(today, 7), end: today };
    if (selectedPeriod === "30days") return { start: subDays(today, 30), end: today };
    if (selectedPeriod === "90days") return { start: subDays(today, 90), end: today };
    return { start: subDays(today, 30), end: today };
  };

  const filteredLogs = useMemo(() => {
    const { start, end } = getDateRange();

    return logs.filter(log => {
      const logDate = log.timestamp ? new Date(log.timestamp) : null;
      if (!logDate || logDate < start || logDate > end) return false;

      if (selectedUser !== "all" && log.user_id !== selectedUser) return false;
      if (selectedAction !== "all" && log.action !== selectedAction) return false;
      if (selectedEntity !== "all" && log.entity_type !== selectedEntity) return false;
      if (selectedResult !== "all" && log.result !== selectedResult) return false;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          log.user_name?.toLowerCase().includes(search) ||
          log.user_email?.toLowerCase().includes(search) ||
          log.entity_name?.toLowerCase().includes(search) ||
          log.action?.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [logs, selectedPeriod, selectedUser, selectedAction, selectedEntity, selectedResult, searchTerm]);

  const uniqueEntities = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];

  const handleExportCSV = () => {
    const headers = ["Data/Hora", "Usuário", "Email", "Ação", "Entidade", "Resultado", "IP"];
    const rows = filteredLogs.map(log => [
      format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss"),
      log.user_name,
      log.user_email,
      getActionLabel(log.action),
      log.entity_type ? `${log.entity_type} ${log.entity_id || ''}` : '-',
      log.result === 'success' ? 'Sucesso' : 'Erro',
      log.ip_address || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  if (!user || (user.role !== "admin" && user.role !== "financeiro" && user.role !== "seguranca")) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Acesso Negado</h2>
              <p className="text-slate-600">Você não tem permissão para acessar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AuditPageView pageName="Auditoria" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#355340]" />
            Auditoria de Ações
          </h1>
          <p className="text-slate-500 text-sm mt-1">Rastreamento completo de ações sensíveis</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total de Eventos</p>
                <p className="text-2xl font-bold text-slate-900">{filteredLogs.length}</p>
              </div>
              <Shield className="h-8 w-8 text-[#355340]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Sucessos</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {filteredLogs.filter(l => l.result === "success").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Erros</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredLogs.filter(l => l.result === "error").length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Usuários Ativos</p>
                <p className="text-2xl font-bold text-slate-900">
                  {[...new Set(filteredLogs.map(l => l.user_id))].length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Usuário</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Ação</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.keys(actionLabels).map(key => (
                    <SelectItem key={key} value={key}>
                      {actionLabels[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Entidade</label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueEntities.map(entity => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-2 block">Resultado</label>
              <Select value={selectedResult} onValueChange={setSelectedResult}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por usuário, email, entidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">
            Eventos Registrados ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum evento encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => openDetails(log)}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={
                            log.result === "success"
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : "border-red-200 text-red-700 bg-red-50"
                          }
                        >
                          {log.result === "success" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {log.result === "success" ? "Sucesso" : "Erro"}
                        </Badge>
                        <Badge variant="outline" className="border-[#355340]/20 text-[#355340] bg-[#355340]/5">
                          {getActionLabel(log.action)}
                        </Badge>
                        {log.entity_type && (
                          <Badge variant="outline" className="border-slate-200 text-slate-700 bg-slate-50">
                            {log.entity_type}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Usuário:</span>{" "}
                          <span className="font-medium text-slate-900">{log.user_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Email:</span>{" "}
                          <span className="text-slate-700">{log.user_email}</span>
                        </div>
                        {log.entity_name && (
                          <div>
                            <span className="text-slate-500">Entidade:</span>{" "}
                            <span className="text-slate-700">{log.entity_name}</span>
                          </div>
                        )}
                      </div>
                      {log.error_message && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500 flex items-center gap-1 justify-end mb-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.timestamp), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(log.timestamp), "HH:mm:ss")}
                      </p>
                      {log.ip_address && (
                        <p className="text-xs text-slate-400 mt-1">IP: {log.ip_address}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento de Auditoria</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Usuário</p>
                  <p className="font-medium text-slate-900">{selectedLog.user_name}</p>
                  <p className="text-sm text-slate-600">{selectedLog.user_email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Data/Hora</p>
                  <p className="font-medium text-slate-900">
                    {format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Ação</p>
                  <Badge variant="outline" className="border-[#355340]/20 text-[#355340] bg-[#355340]/5">
                    {getActionLabel(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Resultado</p>
                  <Badge
                    variant="outline"
                    className={
                      selectedLog.result === "success"
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                        : "border-red-200 text-red-700 bg-red-50"
                    }
                  >
                    {selectedLog.result === "success" ? "Sucesso" : "Erro"}
                  </Badge>
                </div>
                {selectedLog.entity_type && (
                  <>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Tipo de Entidade</p>
                      <p className="font-medium text-slate-900">{selectedLog.entity_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">ID da Entidade</p>
                      <p className="font-mono text-sm text-slate-700">{selectedLog.entity_id || "-"}</p>
                    </div>
                  </>
                )}
                {selectedLog.ip_address && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">IP de Origem</p>
                    <p className="font-mono text-sm text-slate-700">{selectedLog.ip_address}</p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {selectedLog.error_message && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Mensagem de Erro</p>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {/* Before/After Comparison */}
              {(selectedLog.before_snapshot || selectedLog.after_snapshot) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedLog.before_snapshot && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2 font-semibold">Estado Anterior</p>
                      <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs overflow-auto max-h-96">
                        {JSON.stringify(selectedLog.before_snapshot, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.after_snapshot && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2 font-semibold">Estado Posterior</p>
                      <pre className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs overflow-auto max-h-96">
                        {JSON.stringify(selectedLog.after_snapshot, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Changed Fields */}
              {selectedLog.metadata?.changed_fields && selectedLog.metadata.changed_fields.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Campos Alterados ({selectedLog.metadata.changed_fields.length})</p>
                  <div className="space-y-2">
                    {selectedLog.metadata.changed_fields.map((change, idx) => (
                      <div key={idx} className="p-3 border border-slate-200 rounded-lg">
                        <p className="text-xs font-semibold text-slate-700 mb-2">
                          Campo: <span className="font-mono text-[#355340]">{change.field}</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-slate-500 mb-1">Valor Anterior:</p>
                            <pre className="p-2 bg-red-50 border border-red-200 rounded text-red-700 overflow-auto">
                              {typeof change.old_value === 'object' 
                                ? JSON.stringify(change.old_value, null, 2) 
                                : change.old_value || '(vazio)'}
                            </pre>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-1">Valor Novo:</p>
                            <pre className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 overflow-auto">
                              {typeof change.new_value === 'object' 
                                ? JSON.stringify(change.new_value, null, 2) 
                                : change.new_value || '(vazio)'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div>
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Metadados Completos</p>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs overflow-auto max-h-96">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.user_agent && selectedLog.user_agent !== 'unknown' && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">User Agent</p>
                  <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-200">
                    {selectedLog.user_agent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}