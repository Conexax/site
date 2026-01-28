import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Plus,
  Search,
  Briefcase,
  Target,
  DollarSign,
  MoreVertical,
  Pencil,
  Trash2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function CommercialTeam() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    monthly_goal: "",
    commission_percentage: "",
    status: "active"
  });

  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["commercialTeam"],
    queryFn: () => base44.entities.CommercialTeamMember.list(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CommercialTeamMember.create({
      ...data,
      monthly_goal: data.monthly_goal ? parseFloat(data.monthly_goal) : null,
      commission_percentage: data.commission_percentage ? parseFloat(data.commission_percentage) : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commercialTeam"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommercialTeamMember.update(id, {
      ...data,
      monthly_goal: data.monthly_goal ? parseFloat(data.monthly_goal) : null,
      commission_percentage: data.commission_percentage ? parseFloat(data.commission_percentage) : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commercialTeam"] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommercialTeamMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commercialTeam"] });
    },
  });

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        monthly_goal: member.monthly_goal?.toString() || "",
        commission_percentage: member.commission_percentage?.toString() || "",
        status: member.status || "active"
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        monthly_goal: "",
        commission_percentage: "",
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

  const filteredMembers = members.filter((member) =>
    member.name?.toLowerCase().includes(search.toLowerCase()) ||
    member.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getMemberStats = (memberId) => {
    const memberContracts = contracts.filter(c => c.seller_id === memberId);
    const activeContracts = memberContracts.filter(c => c.status === "active");
    const totalRevenue = activeContracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);
    const clientCount = clients.filter(c => c.commercial_team_id === memberId).length;
    return { contractsCount: memberContracts.length, totalRevenue, clientCount };
  };

  const totalMonthlyGoal = members.reduce((sum, m) => sum + (m.monthly_goal || 0), 0);
  const totalActiveRevenue = contracts
    .filter(c => c.status === "active")
    .reduce((sum, c) => sum + (c.monthly_value || 0), 0);
  const activeMembers = members.filter(m => m.status === "active").length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipe Comercial</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie vendedores e metas</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#355340] hover:bg-[#355340]/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Vendedor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Vendedores Ativos" value={activeMembers} icon={Users} />
        <StatsCard 
          title="Meta Mensal Total" 
          value={`R$ ${totalMonthlyGoal.toLocaleString("pt-BR")}`} 
          icon={Target} 
          iconClassName="bg-amber-500" 
        />
        <StatsCard 
          title="Receita Recorrente" 
          value={`R$ ${totalActiveRevenue.toLocaleString("pt-BR")}`} 
          icon={DollarSign} 
          iconClassName="bg-emerald-500" 
        />
        <StatsCard 
          title="Contratos Ativos" 
          value={contracts.filter(c => c.status === "active").length} 
          icon={Briefcase} 
          iconClassName="bg-blue-500" 
        />
      </div>

      {/* Search */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar vendedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
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
              icon={Briefcase}
              title="Nenhum vendedor cadastrado"
              description="Adicione membros à equipe comercial"
              actionLabel="Novo Vendedor"
              onAction={() => handleOpenDialog()}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const stats = getMemberStats(member.id);
            return (
              <Card key={member.id} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#62997f]/20 rounded-xl flex items-center justify-center">
                        <span className="text-[#355340] font-bold text-lg">
                          {member.name?.charAt(0) || "V"}
                        </span>
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
                  
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{stats.clientCount}</p>
                      <p className="text-xs text-slate-500">Clientes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{stats.contractsCount}</p>
                      <p className="text-xs text-slate-500">Contratos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">
                        {member.commission_percentage ? `${member.commission_percentage}%` : "-"}
                      </p>
                      <p className="text-xs text-slate-500">Comissão</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Meta Mensal</p>
                      <p className="text-sm font-semibold">
                        R$ {member.monthly_goal?.toLocaleString("pt-BR") || "0"}
                      </p>
                    </div>
                    <StatusBadge status={member.status} />
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
              {editingMember ? "Editar Vendedor" : "Novo Vendedor"}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Meta Mensal (R$)</Label>
                <Input
                  type="number"
                  value={formData.monthly_goal}
                  onChange={(e) => setFormData({ ...formData, monthly_goal: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  value={formData.commission_percentage}
                  onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })}
                  placeholder="0"
                />
              </div>
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