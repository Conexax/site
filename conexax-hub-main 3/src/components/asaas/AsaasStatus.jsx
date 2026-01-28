import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Activity, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AsaasStatus() {
  const { data: providers = [] } = useQuery({
    queryKey: ["integrationProviders"],
    queryFn: () => base44.entities.IntegrationProvider.list(),
  });

  const { data: webhooks = [] } = useQuery({
    queryKey: ["webhookEndpoints"],
    queryFn: () => base44.entities.WebhookEndpoint.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["webhookEvents"],
    queryFn: () => base44.entities.WebhookEvent.filter({ provider: "asaas" }, "-created_date", 1),
  });

  const asaasProvider = providers.find(p => p.name === "asaas");
  const asaasWebhook = webhooks.find(w => w.provider === "asaas");
  const lastEvent = events[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-violet-600" />
            Status da Integração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium text-slate-900">Status da Conexão</p>
              <p className="text-sm text-slate-600">
                {asaasProvider ? "Conectado e configurado" : "Não conectado"}
              </p>
            </div>
            {asaasProvider?.isConnected ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">
                <XCircle className="h-3 w-3 mr-1" />
                Desconectado
              </Badge>
            )}
          </div>

          {asaasProvider && (
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-slate-900">Ambiente</p>
                <p className="text-sm text-slate-600">
                  Ambiente de operação configurado
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                {asaasProvider.environment === "sandbox" ? "Sandbox" : "Produção"}
              </Badge>
            </div>
          )}

          {asaasProvider && (
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-slate-900">Última Atualização</p>
                <p className="text-sm text-slate-600">
                  Última vez que a configuração foi modificada
                </p>
              </div>
              <p className="text-sm text-slate-600">
                {format(new Date(asaasProvider.updated_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}

          {asaasWebhook && (
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-slate-900">Webhooks</p>
                <p className="text-sm text-slate-600">
                  {asaasWebhook.events?.length || 0} eventos configurados
                </p>
              </div>
              {asaasWebhook.isActive ? (
                <Badge className="bg-green-100 text-green-800">
                  <Zap className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>
              )}
            </div>
          )}

          {lastEvent && (
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Último Webhook Recebido</p>
                <p className="text-sm text-slate-600">
                  {lastEvent.eventType}
                </p>
              </div>
              <p className="text-sm text-slate-600">
                {format(new Date(lastEvent.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}