import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Plus,
  Search,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Palette,
  Megaphone,
  Zap,
  Settings,
  Headphones
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/ui/StatusBadge";
import StatsCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

const roleIcons = {
  traffic: Megaphone,
  design: Palette,
  copy: Zap,
  automation: Settings,
  support: Headphones
};

const roleLabels = {
  traffic: "Tráfego",
  design: "Design",
  copy: "Copy",
  automation: "Automação",
  support: "Suporte"
};

export default function OperationalTeam() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "traffic",
    status: "active"
  });

  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["operationalTeam"],
    queryFn: () => base44.entities.OperationalTeamMember.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.Activity.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationalTeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operationalTeam"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OperationalTeamMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operationalTeam"] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OperationalTeamMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operationalTeam"] });
    },
  });

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        role: member.role || "traffic",
        status: member.status || "active"
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "traffic",
        status: "active"
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMember(null);
  };

  const handleSubmit = () => {
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      member.name?.toLowerCase().includes(search.toLowerCase()) ||
      member.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getMemberStats = (memberId) => {
    const memberClients = clients.filter(c => c.operational_team_ids?.includes(memberId));
    const memberActivities = activities.filter(a => a.responsible_id === memberId);
    const pendingActivities = memberActivities.filter(a => a.status === "pending" || a.status === "in_progress");
    return { 
      clientCount: memberClients.length, 
      activityCount: memberActivities.length,
      pendingCount: pendingActivities.length
    };
  };

  const activeMembers = members.filter(m => m.status === "active").length;
  const roleCount = Object.keys(roleLabels).reduce((acc, role) => {
    acc[role] = members.filter(m => m.role === role && m.status === "active").length;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipe Operacional</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie a equipe de operações</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#355340] hover:bg-[#355340]/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Membro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Total Ativos" value={activeMembers} icon={Users} />
        <StatsCard title="Tráfego" value={roleCount.traffic || 0} icon={Megaphone} iconClassName="bg-blue-500" />
        <StatsCard title="Design" value={roleCount.design || 0} icon={Palette} iconClassName="bg-pink-500" />
        <StatsCard title="Copy" value={roleCount.copy || 0} icon={Zap} iconClassName="bg-amber-500" />
        <StatsCard title="Automação" value={roleCount.automation || 0} icon={Settings} iconClassName="bg-emerald-500" />
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar membro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Funções</SelectItem>
                <SelectItem value="traffic">Tráfego</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="copy">Copy</SelectItem>
                <SelectItem value="automation">Automação</SelectItem>
                <SelectItem value="support">Suporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Team List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title="Nenhum membro cadastrado"
              description="Adicione membros à equipe operacional"
              actionLabel="Novo Membro"
              onAction={() => handleOpenDialog()}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const stats = getMemberStats(member.id);
            const RoleIcon = roleIcons[member.role] || Users;
            return (
              <Card key={member.id} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <RoleIcon className="h-6 w-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{member.name}</h3>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(member)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => deleteMutation.mutate(member.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700">
                      {roleLabels[member.role] || member.role}
                    </span>
                    <StatusBadge status={member.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{stats.clientCount}</p>
                      <p className="text-xs text-slate-500">Clientes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{stats.activityCount}</p>
                      <p className="text-xs text-slate-500">Atividades</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-amber-600">{stats.pendingCount}</p>
                      <p className="text-xs text-slate-500">Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Editar Membro" : "Novo Membro"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>Função *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="traffic">Tráfego</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="copy">Copy</SelectItem>
                  <SelectItem value="automation">Automação</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={!formData.name || !formData.email}
            >
              {editingMember ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}