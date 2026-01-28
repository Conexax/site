import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function SendForSignatureDialog({ contract, client, open, onOpenChange }) {
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [platform, setPlatform] = useState("clicksign");
  const [signatureUrl, setSignatureUrl] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (contract && client) {
      setSignerName(client.responsible_name || "");
      setSignerEmail(client.email || "");
    }
  }, [contract, client]);

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sendContractForSignature', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setSignatureUrl(data.signature_url);
      toast.success("Contrato enviado para assinatura!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Erro ao enviar contrato");
    }
  });

  const handleSend = () => {
    if (!contract) {
      toast.error("Contrato não selecionado");
      return;
    }

    if (!signerName.trim() || !signerEmail.trim()) {
      toast.error("Preencha nome e e-mail do assinante");
      return;
    }

    sendMutation.mutate({
      contract_id: contract.id,
      signer_name: signerName,
      signer_email: signerEmail,
      platform: platform
    });
  };

  const handleClose = () => {
    setSignatureUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar para Assinatura Eletrônica</DialogTitle>
          <DialogDescription>
            Envie o contrato para assinatura digital via plataforma integrada
          </DialogDescription>
        </DialogHeader>

        {!signatureUrl ? (
          <div className="space-y-4">
            <div>
              <Label>Plataforma de Assinatura</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clicksign">Clicksign</SelectItem>
                  <SelectItem value="docusign" disabled>
                    DocuSign (em breve)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nome do Assinante *</Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <Label>E-mail do Assinante *</Label>
              <Input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            {contract && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Contrato:</strong> #{contract.contract_number || contract.id.slice(0, 8)}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Cliente:</strong> {client?.company_name}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  O assinante receberá um e-mail com o link para assinar digitalmente.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-center py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Contrato Enviado!
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Um e-mail foi enviado para <strong>{signerEmail}</strong> com o link para assinatura.
              </p>
              <a
                href={signatureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#355340] hover:text-[#355340]/80 font-medium"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir link de assinatura
              </a>
            </div>
          </div>
        )}

        <DialogFooter>
          {!signatureUrl ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendMutation.isPending}
                className="bg-[#355340] hover:bg-[#355340]/90"
              >
                {sendMutation.isPending ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar para Assinatura
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}