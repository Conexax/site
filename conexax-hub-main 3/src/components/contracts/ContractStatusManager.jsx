import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  draft: {
    label: "Rascunho",
    icon: FileText,
    color: "bg-slate-100 text-slate-700",
    nextActions: [
      { status: "sent", label: "Marcar como Enviado", requiresReason: false },
      { status: "cancelled", label: "Cancelar", requiresReason: true }
    ]
  },
  sent: {
    label: "Enviado",
    icon: Send,
    color: "bg-blue-100 text-blue-700",
    nextActions: [
      { status: "signed", label: "Marcar como Assinado", requiresReason: false },
      { status: "cancelled", label: "Cancelar", requiresReason: true }
    ]
  },
  signed: {
    label: "Assinado",
    icon: CheckCircle,
    color: "bg-green-100 text-green-700",
    nextActions: []
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    color: "bg-red-100 text-red-700",
    nextActions: []
  }
};

export default function ContractStatusManager({ contract, compact = false }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const currentConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
  const StatusIcon = currentConfig.icon;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ new_status, reason }) => {
      const response = await base44.functions.invoke("updateContractStatus", {
        contract_id: contract.id,
        new_status,
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Status atualizado com sucesso");
      setDialogOpen(false);
      setSelectedAction(null);
      setReason("");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Erro ao atualizar status");
    }
  });

  const handleOpenDialog = (action) => {
    setSelectedAction(action);
    setReason("");
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (selectedAction.requiresReason && !reason.trim()) {
      toast.error("Por favor, informe o motivo");
      return;
    }

    updateStatusMutation.mutate({
      new_status: selectedAction.status,
      reason: reason.trim() || null
    });
  };

  if (compact) {
    return (
      <>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium ${currentConfig.color}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {currentConfig.label}
        </div>
        {currentConfig.nextActions.length > 0 && (
          <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            {currentConfig.nextActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDialog(action);
                }}
                className="h-7 text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedAction?.label}</DialogTitle>
            </DialogHeader>
            {selectedAction?.requiresReason && (
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo..."
                  rows={3}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={updateStatusMutation.isPending}
                className="bg-[#355340] hover:bg-[#355340]/90"
              >
                {updateStatusMutation.isPending ? "Processando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${currentConfig.color}`}>
            <StatusIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Status Atual</p>
            <p className="text-lg font-semibold text-slate-800">{currentConfig.label}</p>
          </div>
        </div>
      </div>

      {currentConfig.nextActions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Ações Disponíveis</Label>
          <div className="flex flex-wrap gap-2">
            {currentConfig.nextActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                onClick={() => handleOpenDialog(action)}
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {currentConfig.nextActions.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Este contrato está em status final. Não há mais ações disponíveis.
          </p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAction?.label}</DialogTitle>
          </DialogHeader>
          {selectedAction?.requiresReason && (
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={updateStatusMutation.isPending}
              className="bg-[#355340] hover:bg-[#355340]/90"
            >
              {updateStatusMutation.isPending ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}