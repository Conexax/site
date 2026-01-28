import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EmptyState from "../ui/EmptyState";

export default function AsaasEvents() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["webhookEvents"],
    queryFn: () => base44.entities.WebhookEvent.filter({ provider: "asaas" }, "-created_date", 50),
  });

  const statusColors = {
    received: "bg-blue-100 text-blue-800",
    processed: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    received: "Recebido",
    processed: "Processado",
    error: "Erro",
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando eventos...</div>;
  }

  if (events.length === 0) {
    return (
      <EmptyState
        title="Nenhum evento recebido"
        description="Os webhooks do Asaas aparecerão aqui quando forem recebidos"
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Eventos</CardTitle>
          <CardDescription>
            Últimos 50 eventos recebidos do Asaas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">
                      {format(new Date(event.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{event.eventType}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {event.reference || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[event.status]}>
                        {statusLabels[event.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-600">Tipo</Label>
                <p className="text-slate-900">{selectedEvent.eventType}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600">Status</Label>
                <div className="mt-1">
                  <Badge className={statusColors[selectedEvent.status]}>
                    {statusLabels[selectedEvent.status]}
                  </Badge>
                </div>
              </div>
              {selectedEvent.reference && (
                <div>
                  <Label className="text-sm font-medium text-slate-600">Referência</Label>
                  <p className="text-slate-900">{selectedEvent.reference}</p>
                </div>
              )}
              {selectedEvent.errorMessage && (
                <div>
                  <Label className="text-sm font-medium text-red-600">Erro</Label>
                  <p className="text-red-800">{selectedEvent.errorMessage}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-slate-600">Payload</Label>
                <pre className="mt-2 bg-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}