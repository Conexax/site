import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function SquadAssignment({ client, onSuccess }) {
  const [selectedSquadId, setSelectedSquadId] = useState(client.squad_id || "");
  const [reason, setReason] = useState("");
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: squads = [] } = useQuery({
    queryKey: ["squads"],
    queryFn: () => base44.entities.Squad.list(),
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, squadId, oldSquadId }) => {
      // Update client
      await base44.entities.Client.update(clientId, { squad_id: squadId });

      // Update old squad capacity
      if (oldSquadId) {
        const oldSquad = squads.find(s => s.id === oldSquadId);
        if (oldSquad) {
          await base44.entities.Squad.update(oldSquadId, {
            current_capacity: Math.max(0, (oldSquad.current_capacity || 0) - 1),
            accounts_served: (oldSquad.accounts_served || []).filter(id => id !== clientId)
          });
        }
      }

      // Update new squad capacity
      if (squadId) {
        const newSquad = squads.find(s => s.id === squadId);
        if (newSquad) {
          await base44.entities.Squad.update(squadId, {
            current_capacity: (newSquad.current_capacity || 0) + 1,
            accounts_served: [...(newSquad.accounts_served || []), clientId]
          });
        }
      }

      // Create history record
      const oldSquad = squads.find(s => s.id === oldSquadId);
      const newSquad = squads.find(s => s.id === squadId);
      
      await base44.entities.SquadHistory.create({
        client_id: clientId,
        client_name: client.company_name,
        from_squad_id: oldSquadId || null,
        from_squad_name: oldSquad?.name || null,
        to_squad_id: squadId,
        to_squad_name: newSquad?.name || "Sem squad",
        moved_by: user?.id,
        moved_by_name: user?.full_name,
        reason: reason || null,
        movement_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squads"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["squadHistory"] });
      toast.success("Squad atribuído com sucesso");
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error("Erro ao atribuir squad: " + error.message);
    }
  });

  const handleAssign = () => {
    const selectedSquad = squads.find(s => s.id === selectedSquadId);
    
    // Check capacity
    if (selectedSquad) {
      const willExceed = (selectedSquad.current_capacity || 0) >= selectedSquad.max_capacity;
      
      if (willExceed && selectedSquadId !== client.squad_id) {
        const confirm = window.confirm(
          `ATENÇÃO: O squad "${selectedSquad.name}" já está na capacidade máxima (${selectedSquad.current_capacity}/${selectedSquad.max_capacity}).\n\nDeseja continuar mesmo assim?`
        );
        if (!confirm) return;
      }
    }

    updateClientMutation.mutate({
      clientId: client.id,
      squadId: selectedSquadId,
      oldSquadId: client.squad_id
    });
  };

  const getSquadStatus = (squad) => {
    const percentage = (squad.current_capacity / squad.max_capacity) * 100;
    if (percentage >= 100) return { icon: AlertCircle, color: "text-red-600", label: "Sobrecarregado" };
    if (percentage >= (squad.alert_threshold_critical || 90)) return { icon: AlertTriangle, color: "text-orange-600", label: "Crítico" };
    if (percentage >= (squad.alert_threshold_warning || 80)) return { icon: AlertTriangle, color: "text-amber-600", label: "Atenção" };
    return { icon: CheckCircle, color: "text-emerald-600", label: "Disponível" };
  };

  const activeSquads = squads.filter(s => s.status === "active");
  const currentSquad = squads.find(s => s.id === client.squad_id);

  return (
    <div className="space-y-4">
      <div>
        <Label>Squad Atual</Label>
        <div className="mt-2 p-3 bg-slate-50 rounded-lg">
          <p className="font-medium text-slate-900">
            {currentSquad?.name || "Nenhum squad atribuído"}
          </p>
          {currentSquad && (
            <div className="flex items-center gap-2 mt-2">
              <Progress 
                value={(currentSquad.current_capacity / currentSquad.max_capacity) * 100} 
                className="h-1.5 flex-1"
              />
              <span className="text-xs text-slate-500">
                {currentSquad.current_capacity}/{currentSquad.max_capacity}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Atribuir a Novo Squad</Label>
        <Select value={selectedSquadId} onValueChange={setSelectedSquadId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um squad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Sem squad</SelectItem>
            {activeSquads.map((squad) => {
              const status = getSquadStatus(squad);
              const StatusIcon = status.icon;
              return (
                <SelectItem key={squad.id} value={squad.id}>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-3 w-3 ${status.color}`} />
                    <span>{squad.name}</span>
                    <span className="text-xs text-slate-500">
                      ({squad.current_capacity}/{squad.max_capacity})
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {selectedSquadId && selectedSquadId !== client.squad_id && (
        <>
          <div>
            <Label>Motivo da Movimentação (opcional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da mudança de squad..."
              rows={3}
            />
          </div>

          {(() => {
            const selectedSquad = squads.find(s => s.id === selectedSquadId);
            if (!selectedSquad) return null;
            
            const status = getSquadStatus(selectedSquad);
            const willExceed = (selectedSquad.current_capacity || 0) >= selectedSquad.max_capacity;

            if (willExceed) {
              return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Atenção: Capacidade Excedida</p>
                    <p className="text-xs mt-1">
                      O squad "{selectedSquad.name}" já está com {selectedSquad.current_capacity}/{selectedSquad.max_capacity} contas.
                      Atribuir esta conta excederá a capacidade máxima.
                    </p>
                  </div>
                </div>
              );
            }

            if (status.label !== "Disponível") {
              return (
                <div className={`${
                  status.color === 'text-orange-600' ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'
                } border rounded-lg p-3 flex items-start gap-2`}>
                  <AlertTriangle className={`h-4 w-4 ${status.color} flex-shrink-0 mt-0.5`} />
                  <div className="text-sm">
                    <p className={`font-medium ${status.color}`}>{status.label}</p>
                    <p className="text-xs mt-1 text-slate-600">
                      Squad com {((selectedSquad.current_capacity / selectedSquad.max_capacity) * 100).toFixed(0)}% da capacidade.
                    </p>
                  </div>
                </div>
              );
            }
          })()}
        </>
      )}

      <Button
        onClick={handleAssign}
        disabled={!selectedSquadId || selectedSquadId === client.squad_id || updateClientMutation.isPending}
        className="w-full bg-[#355340] hover:bg-[#355340]/90"
      >
        {updateClientMutation.isPending ? "Atribuindo..." : "Atribuir ao Squad"}
      </Button>
    </div>
  );
}