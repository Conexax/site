import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Settings, Copy } from "lucide-react";
import { toast } from "sonner";

const PROVIDER_EVENTS = {
  yampi: [
    { id: "order.paid", label: "Pedido pago" },
    { id: "order.canceled", label: "Pedido cancelado" },
    { id: "order.refunded", label: "Pedido reembolsado" }
  ],
  shopify: [
    { id: "orders/paid", label: "Pedido pago" },
    { id: "orders/cancelled", label: "Pedido cancelado" },
    { id: "refunds/create", label: "Reembolso criado" }
  ],
  kiwify: [
    { id: "order.paid", label: "Pedido pago" },
    { id: "order.refunded", label: "Pedido reembolsado" }
  ]
};

export default function CheckoutProviderCard({ provider }) {
  const [showDialog, setShowDialog] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedEvents, setSelectedEvents] = useState([]);

  const queryClient = useQueryClient();
  const webhookUrl = `${window.location.origin}/api/webhooks/${provider.id}`;

  const { data: connections = [] } = useQuery({
    queryKey: ["checkoutConnections"],
    queryFn: () => base44.entities.CheckoutProviderConnection.list(),
  });

  const connection = connections.find(c => c.provider === provider.id);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (connection) {
        return base44.entities.CheckoutProviderConnection.update(connection.id, data);
      }
      return base44.entities.CheckoutProviderConnection.create({
        provider: provider.id,
        webhookSecret: Math.random().toString(36).substring(2, 15),
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkoutConnections"] });
      setShowDialog(false);
      toast.success("Configuração salva");
    },
  });

  const handleOpen = () => {
    if (connection) {
      setStoreId(connection.storeId || "");
      setApiKey(connection.credentials?.apiKey || "");
      setSelectedEvents(connection.webhookEvents || []);
    }
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!storeId.trim() || !apiKey.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error("Selecione pelo menos um evento");
      return;
    }

    saveMutation.mutate({
      storeId: storeId.trim(),
      credentials: { apiKey: apiKey.trim() },
      webhookEvents: selectedEvents,
      isConnected: true
    });
  };

  const toggleEvent = (eventId) => {
    setSelectedEvents(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{provider.logo}</div>
              <div>
                <CardTitle>{provider.name}</CardTitle>
                <p className="text-sm text-slate-600 mt-1">{provider.description}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Status</span>
            {connection?.isConnected ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">
                <XCircle className="h-3 w-3 mr-1" />
                Não conectado
              </Badge>
            )}
          </div>
          <Button onClick={handleOpen} className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            {connection?.isConnected ? "Gerenciar" : "Conectar"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar {provider.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>URL do Webhook</Label>
              <div className="flex gap-2 mt-1">
                <Input value={webhookUrl} readOnly className="flex-1" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copiado!"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>ID da Loja *</Label>
              <Input
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="Ex: minha-loja"
              />
            </div>

            <div>
              <Label>API Key *</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Chave de API"
              />
            </div>

            <div>
              <Label>Eventos do Webhook</Label>
              <div className="space-y-3 mt-2">
                {PROVIDER_EVENTS[provider.id]?.map((event) => (
                  <div key={event.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={event.id}
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    <Label htmlFor={event.id} className="cursor-pointer">
                      {event.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}