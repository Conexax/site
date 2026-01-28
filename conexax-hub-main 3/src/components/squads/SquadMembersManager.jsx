import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, X, Plus, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function SquadMembersManager({ squad, onUpdate }) {
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const { data: operationalTeam = [] } = useQuery({
    queryKey: ["operationalTeam"],
    queryFn: () => base44.entities.OperationalTeamMember.list(),
  });

  const currentMembers = squad.member_ids || [];
  const availableMembers = operationalTeam.filter(
    member => !currentMembers.includes(member.id) && member.id !== squad.leader_id
  );

  const handleAddMember = () => {
    const member = operationalTeam.find(m => m.id === selectedMemberId);
    if (!member) return;

    const updatedMemberIds = [...(squad.member_ids || []), member.id];
    const updatedMemberNames = [...(squad.member_names || []), member.name];

    onUpdate({
      member_ids: updatedMemberIds,
      member_names: updatedMemberNames
    });

    setSelectedMemberId("");
  };

  const handleRemoveMember = (memberId) => {
    const memberIndex = squad.member_ids.indexOf(memberId);
    
    const updatedMemberIds = squad.member_ids.filter(id => id !== memberId);
    const updatedMemberNames = squad.member_names.filter((_, idx) => idx !== memberIndex);

    onUpdate({
      member_ids: updatedMemberIds,
      member_names: updatedMemberNames
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Líder do Squad</Label>
        <div className="mt-2 flex items-center gap-2 p-3 bg-[#355340]/10 rounded-lg border border-[#355340]/20">
          <UserCircle className="h-4 w-4 text-[#355340]" />
          <span className="font-medium text-slate-900">{squad.leader_name || "Sem líder"}</span>
          <Badge className="ml-auto bg-[#355340] text-white">Líder</Badge>
        </div>
      </div>

      <div>
        <Label>Membros do Squad ({currentMembers.length})</Label>
        <div className="mt-2 space-y-2">
          {currentMembers.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhum membro adicionado</p>
            </div>
          ) : (
            currentMembers.map((memberId, idx) => (
              <div key={memberId} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                <UserCircle className="h-4 w-4 text-slate-400" />
                <span className="flex-1 text-sm font-medium text-slate-900">
                  {squad.member_names?.[idx] || "Membro"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                  onClick={() => handleRemoveMember(memberId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <Label>Adicionar Membro</Label>
        <div className="flex gap-2 mt-2">
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um membro" />
            </SelectTrigger>
            <SelectContent>
              {availableMembers.length === 0 ? (
                <div className="p-2 text-sm text-slate-500 text-center">
                  Nenhum membro disponível
                </div>
              ) : (
                availableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddMember}
            disabled={!selectedMemberId}
            className="bg-[#355340] hover:bg-[#355340]/90"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}