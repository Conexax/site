import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Copy, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ASAAS_EVENTS = [
  { id: "PAYMENT_CREATED", label: "Cobrança criada" },
  { id: "PAYMENT_UPDATED", label: "Cobrança atualizada" },
  { id: "PAYMENT_CONFIRMED", label: "Pagamento confirmado" },
  { id: "PAYMENT_RECEIVED", label: "Pagamento recebido" },
  { id: "PAYMENT_OVERDUE", label: "Pagamento vencido" },
  { id: "PAYMENT_DELETED", label: "Cobrança deletada" },
  { id: "PAYMENT_RESTORED", label: "Cobrança restaurada" },
];

export default function AsaasWebhooks() {
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [showToken, setShowToken] = useState(false);
  const [success, setSuccess] = useState(false);

  const queryClient = useQueryClient();
  const webhookUrl = `${window.location.origin}/api/webhooks/asaas`;

  const { data: webhooks = [] } = useQuery({
    queryKey: ["webhookEndpoints"],
    queryFn: () => base44.entities.WebhookEndpoint.list(),
  });

  const asaasWebhook = webhooks.find(w => w.provider === "asaas");

  useEffect(() => {
    if (asaasWebhook) {
      setSelectedEvents(asaasWebhook.events || []);
    }
  }, [asaasWebhook]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (asaasWebhook) {
        return base44.entities.WebhookEndpoint.update(asaasWebhook.id, data);
      } else {
        const secretToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        return base44.entities.WebhookEndpoint.create({
          ...data,
          secretToken,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhookEndpoints"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const handleEventToggle = (eventId) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSave = () => {
    if (selectedEvents.length === 0) {
      toast.error("Selecione pelo menos um evento.");
      return;
    }

    saveMutation.mutate({
      provider: "asaas",
      url: webhookUrl,
      events: selectedEvents,
      isActive: true,
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>URL do Webhook</CardTitle>
          <CardDescription>
            Configure esta URL no painel do Asaas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="flex-1" />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {asaasWebhook && (
        <Card>
          <CardHeader>
            <CardTitle>Token Secreto</CardTitle>
            <CardDescription>
              Use este token para validar os webhooks recebidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={showToken ? asaasWebhook.secretToken : "••••••••••••••••"}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(asaasWebhook.secretToken)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Eventos Inscritos</CardTitle>
          <CardDescription>
            Selecione os eventos que deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {ASAAS_EVENTS.map((event) => (
              <div key={event.id} className="flex items-center space-x-2">
                <Checkbox
                  id={event.id}
                  checked={selectedEvents.includes(event.id)}
                  onCheckedChange={() => handleEventToggle(event.id)}
                />
                <Label htmlFor={event.id} className="cursor-pointer">
                  {event.label}
                </Label>
              </div>
            ))}
          </div>

          <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
            Salvar webhooks
          </Button>

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Configurações de webhook salvas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}