import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, 
  ChevronDown, 
  ChevronRight,
  Clock,
  User,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const formatDateTime = (date) => {
  if (!date) return "";
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

const ActionLabel = {
  CREATE_CONTRACT: "Contrato criado",
  UPDATE_CONTRACT: "Contrato atualizado",
  DELETE_CONTRACT: "Contrato deletado"
};

export default function ContractAuditTrail({ contract }) {
  const [expandedEvents, setExpandedEvents] = useState({});

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["auditLogs", "contract", contract.id],
    queryFn: () => 
      base44.entities.AuditLog.filter({
        entity_type: "Contract",
        entity_id: contract.id
      }, "-timestamp", 100),
  });

  const toggleEvent = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const renderDiff = (before, after) => {
    if (!before || !after) return null;

    const changes = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    allKeys.forEach(key => {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes.push({
          field: key,
          before: before[key],
          after: after[key]
        });
      }
    });

    if (changes.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {changes.map((change, idx) => (
          <div key={idx} className="text-sm">
            <p className="font-medium text-slate-600 mb-1">{change.field}:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-600 mb-1">Antes</p>
                <p className="text-slate-700 break-all">
                  {typeof change.before === 'object' 
                    ? JSON.stringify(change.before, null, 2) 
                    : String(change.before || '-')}
                </p>
              </div>
              <div className="p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-600 mb-1">Depois</p>
                <p className="text-slate-700 break-all">
                  {typeof change.after === 'object' 
                    ? JSON.stringify(change.after, null, 2) 
                    : String(change.after || '-')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Combinar logs de auditoria com histórico de status do contrato
  const statusHistory = contract.status_history || [];
  const allEvents = [
    ...auditLogs.map(log => ({
      type: 'audit',
      data: log,
      timestamp: log.timestamp
    })),
    ...statusHistory.map(status => ({
      type: 'status',
      data: status,
      timestamp: status.changed_at
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Trilha de Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (allEvents.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Trilha de Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <AlertCircle className="h-12 w-12 mb-3" />
            <p className="text-sm">Nenhum evento registrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#355340]" />
          Trilha de Auditoria
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Histórico completo de todas as ações realizadas neste contrato
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allEvents.map((event, idx) => {
            const eventId = `${event.type}-${idx}`;
            const isExpanded = expandedEvents[eventId];

            if (event.type === 'status') {
              return (
                <div key={eventId} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <p className="text-sm font-medium text-slate-800">
                          Mudança de Status
                        </p>
                      </div>
                      <p className="text-sm text-slate-600 ml-6">
                        <span className="font-medium">{event.data.from_status}</span>
                        {" → "}
                        <span className="font-medium">{event.data.to_status}</span>
                      </p>
                      {event.data.reason && (
                        <p className="text-xs text-slate-500 ml-6 mt-1">
                          Motivo: {event.data.reason}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 ml-6 mt-1">
                        {formatDateTime(event.data.changed_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            const log = event.data;
            const hasDiff = log.before_snapshot && log.after_snapshot;

            return (
              <div key={eventId} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-800">
                        {ActionLabel[log.action] || log.action}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600 ml-6">
                      Por: {log.user_name} ({log.user_email})
                    </p>
                    {log.metadata?.transition && (
                      <p className="text-xs text-slate-500 ml-6 mt-1">
                        Transição: {log.metadata.transition}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 ml-6 mt-1">
                      {formatDateTime(log.timestamp)}
                    </p>
                  </div>
                  {hasDiff && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEvent(eventId)}
                      className="h-8 w-8 p-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {isExpanded && renderDiff(log.before_snapshot, log.after_snapshot)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}