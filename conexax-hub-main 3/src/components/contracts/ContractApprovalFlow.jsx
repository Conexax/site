import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ContractApprovalFlow({ contract, approval }) {
  const [approvalComment, setApprovalComment] = useState("");
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (status) =>
      base44.entities.ContractApproval.update(approval.id, {
        status: status,
        approval_date: new Date().toISOString(),
        comments: approvalComment
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractApprovals"] });
      toast.success("Contrato aprovado!");
      setApprovalComment("");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    needs_revision: "bg-amber-100 text-amber-800"
  };

  const statusIcons = {
    pending: <AlertCircle className="h-4 w-4" />,
    approved: <Check className="h-4 w-4" />,
    rejected: <X className="h-4 w-4" />
  };

  if (!approval) {
    return null;
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Aprovação do Contrato</span>
          <Badge className={statusColors[approval.status]}>
            {statusIcons[approval.status]}
            <span className="ml-1 capitalize">{approval.status}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-slate-500">Aprovador</p>
            <p className="mt-1">{approval.approver_name}</p>
            <p className="text-xs text-slate-500">{approval.approver_email}</p>
          </div>
          {approval.approval_date && (
            <div>
              <p className="font-medium text-slate-500">Data da Aprovação</p>
              <p className="mt-1">{new Date(approval.approval_date).toLocaleDateString("pt-BR")}</p>
            </div>
          )}
        </div>

        {approval.comments && (
          <div>
            <p className="font-medium text-slate-500 text-sm">Comentários</p>
            <p className="mt-1 p-3 bg-slate-50 rounded text-sm">{approval.comments}</p>
          </div>
        )}

        {approval.status === "pending" && (
          <div className="space-y-3 pt-4 border-t">
            <Label>Adicionar comentário</Label>
            <Textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Aprove ou deixe comentários..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => approveMutation.mutate("rejected")}
                disabled={approveMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" /> Rejeitar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => approveMutation.mutate("approved")}
                disabled={approveMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" /> Aprovar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}