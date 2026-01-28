import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AsaasConnection() {
  const [environment, setEnvironment] = useState("sandbox");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const queryClient = useQueryClient();

  const { data: providers = [] } = useQuery({
    queryKey: ["integrationProviders"],
    queryFn: () => base44.entities.IntegrationProvider.list(),
  });

  const asaasProvider = providers.find(p => p.name === "asaas");

  useEffect(() => {
    if (asaasProvider) {
      setEnvironment(asaasProvider.environment);
      setApiKey(asaasProvider.apiKey || "");
    }
  }, [asaasProvider]);

  const connectMutation = useMutation({
    mutationFn: async (data) => {
      if (asaasProvider) {
        return base44.entities.IntegrationProvider.update(asaasProvider.id, data);
      } else {
        return base44.entities.IntegrationProvider.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrationProviders"] });
      setSuccess(true);
      setError(null);
      setTimeout(() => setSuccess(false), 5000);
    },
    onError: (err) => {
      setError("Não foi possível conectar ao Asaas. Verifique a chave e tente novamente.");
      setSuccess(false);
    },
  });

  const handleConnect = () => {
    if (!apiKey.trim()) {
      setError("A chave de API é obrigatória.");
      return;
    }

    connectMutation.mutate({
      name: "asaas",
      apiKey: apiKey.trim(),
      environment,
      isConnected: true,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurar Conexão</CardTitle>
          <CardDescription>
            Configure a integração com o Asaas informando sua chave de API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="environment">Ambiente</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">Chave de API</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Insira sua chave de API do Asaas"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <Button
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            className="w-full"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              "Conectar"
            )}
          </Button>

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Integração com o Asaas conectada com sucesso.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}