import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Send, Download, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SignatureFlow({ contract, signature }) {
  const [signerEmail, setSignerEmail] = useState(signature?.signer_email || "");
  const [signerName, setSignerName] = useState(signature?.signer_name || "");
  const queryClient = useQueryClient();

  const sendSignatureMutation = useMutation({
    mutationFn: () =>
      base44.entities.ContractSignature.create({
        contract_id: contract.id,
        contract_number: contract.contract_number,
        signer_email: signerEmail,
        signer_name: signerName,
        signature_service: "simulated",
        status: "sent",
        sent_date: new Date().toISOString(),
        expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractSignatures"] });
      toast.success("Link de assinatura enviado!");
      setSignerEmail("");
      setSignerName("");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const statusColors = {
    pending: "bg-slate-100 text-slate-800",
    sent: "bg-blue-100 text-blue-800",
    viewed: "bg-blue-100 text-blue-800",
    signed: "bg-green-100 text-green-800",
    expired: "bg-red-100 text-red-800",
    rejected: "bg-red-100 text-red-800"
  };

  const statusIcons = {
    pending: <Clock className="h-4 w-4" />,
    sent: <Send className="h-4 w-4" />,
    viewed: <Clock className="h-4 w-4" />,
    signed: <CheckCircle className="h-4 w-4" />,
    expired: <AlertCircle className="h-4 w-4" />,
    rejected: <AlertCircle className="h-4 w-4" />
  };

  const statusLabels = {
    pending: "Pendente",
    sent: "Enviado",
    viewed: "Visualizado",
    signed: "Assinado",
    expired: "Expirado",
    rejected: "Rejeitado"
  };

  if (signature) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status da Assinatura</span>
            <Badge className={statusColors[signature.status]}>
              {statusIcons[signature.status]}
              <span className="ml-1">{statusLabels[signature.status]}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-slate-500">Signatário</p>
              <p className="mt-1">{signature.signer_name}</p>
              <p className="text-xs text-slate-500">{signature.signer_email}</p>
            </div>
            {signature.signed_date && (
              <div>
                <p className="font-medium text-slate-500">Data da Assinatura</p>
                <p className="mt-1">{new Date(signature.signed_date).toLocaleDateString("pt-BR")}</p>
              </div>
            )}
          </div>

          {signature.status === "signed" && signature.signed_file_url && (
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <a href={signature.signed_file_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" /> Baixar Contrato Assinado
              </a>
            </Button>
          )}

          {signature.status === "sent" && signature.signature_link && (
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <a href={signature.signature_link} target="_blank" rel="noopener noreferrer">
                <Send className="h-4 w-4 mr-2" /> Link de Assinatura
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>Enviar para Assinatura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Nome do Signatário</Label>
          <Input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Ex: João Silva"
          />
        </div>
        <div>
          <Label>Email do Signatário</Label>
          <Input
            type="email"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            placeholder="Ex: joao@empresa.com"
          />
        </div>
        <p className="text-xs text-slate-500">
          Um link de assinatura será enviado para este email. O link expira em 30 dias.
        </p>
        <Button
          onClick={() => sendSignatureMutation.mutate()}
          disabled={!signerEmail || !signerName || sendSignatureMutation.isPending}
          className="w-full bg-[#355340] hover:bg-[#355340]/90"
        >
          <Send className="h-4 w-4 mr-2" /> Enviar Link de Assinatura
        </Button>
      </CardContent>
    </Card>
  );
}