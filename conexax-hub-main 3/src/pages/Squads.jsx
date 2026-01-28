import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Plus,
  Search,
  Users,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  UserCircle,
  Edit,
  History,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import StatsCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import SquadMembersManager from "@/components/squads/SquadMembersManager";
import { AuditPageView } from "@/components/audit/AuditLogger";
import SquadHealthBadge from "@/components/squads/SquadHealthBadge";
import SquadHealthDetails from "@/components/squads/SquadHealthDetails";
import SquadHealthConfigDialog from "@/components/squads/SquadHealthConfig";
import AdvancedSearch from "@/components/search/AdvancedSearch";
import SortableHeader from "@/components/search/SortableHeader";

export default function Squads() {
  const [search, setSearch] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [savedFilters, setSavedFilters] = useState(() => {
    const saved = localStorage.getItem("squads_filters");
    return saved ? JSON.parse(saved) : [];
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [healthDetailsOpen, setHealthDetailsOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [selectedHealthScore, setSelectedHealthScore] = useState(null);
  const [editingSquad, setEditingSquad] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    leader_id: "",
    leader_name: "",
    member_ids: [],
    member_names: [],
    max_capacity: "",
    alert_threshold_warning: 80,
    alert_threshold_critical: 90,
    description: "",
    status: "active"
  });

  const queryClient = useQueryClient();

  const { data: squads = [], isLoading } = useQuery({
    queryKey: ["squads"],
    queryFn: async () => {
      const result = await base44.entities.Squad.list("-created_date");
      return Array.isArray(result) ? result : [];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: operationalTeam = [] } = useQuery({
    queryKey: ["operationalTeam"],
    queryFn: () => base44.entities.OperationalTeamMember.list(),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["squadHistory", selectedSquad?.id],
    queryFn: () => base44.entities.SquadHistory.list("-movement_date"),
    enabled: !!selectedSquad,
  });

  const { data: healthScores = {} } = useQuery({
    queryKey: ["squadHealthScores"],
    queryFn: async () => {
      const scores = await base44.entities.SquadHealthScore.list("-calculated_at", 500);
      const scoreMap = {};
      scores.forEach(score => {
        scoreMap[score.squad_id] = score;
      });
      return scoreMap;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Squad.create(data);
      return result;
    },
    onSuccess: async () => {
      setSearch("");
      await queryClient.refetchQueries({ queryKey: ["squads"] });
      await queryClient.refetchQueries({ queryKey: ["clients"] });
      handleCloseDialog();
      toast.success("Squad criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar squad: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.entities.Squad.update(id, data);
      return result;
    },
    onSuccess: async () => {
      setSearch("");
      await queryClient.refetchQueries({ queryKey: ["squads"] });
      await queryClient.refetchQueries({ queryKey: ["clients"] });
      handleCloseDialog();
      toast.success("Squad atualizado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar squad: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Verificar se há clientes associados
      const squadClients = clients.filter(c => c.squad_id === id);
      if (squadClients.length > 0) {
        throw new Error(`Não é possível deletar. Este squad possui ${squadClients.length} cliente(s) vinculado(s).`);
      }
      return await base44.entities.Squad.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["squads"] });
      toast.success("Squad deletado com sucesso");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleOpenNew = () => {
    setEditingSquad(null);
    setFormData({
      name: "",
      leader_id: "",
      leader_name: "",
      member_ids: [],
      member_names: [],
      max_capacity: "",
      alert_threshold_warning: 80,
      alert_threshold_critical: 90,
      description: "",
      status: "active"
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (squad) => {
    setEditingSquad(squad);
    setFormData({
      name: squad.name,
      leader_id: squad.leader_id || "",
      leader_name: squad.leader_name || "",
      member_ids: squad.member_ids || [],
      member_names: squad.member_names || [],
      max_capacity: squad.max_capacity?.toString() || "",
      alert_threshold_warning: squad.alert_threshold_warning || 80,
      alert_threshold_critical: squad.alert_threshold_critical || 90,
      description: squad.description || "",
      status: squad.status
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSquad(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.max_capacity) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const data = {
      ...formData,
      max_capacity: parseInt(formData.max_capacity),
      current_capacity: editingSquad?.current_capacity || 0,
      accounts_served: editingSquad?.accounts_served || []
    };

    if (editingSquad) {
      updateMutation.mutate({ id: editingSquad.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleMembersUpdate = (membersData) => {
    setFormData({
      ...formData,
      ...membersData
    });
  };

  const handleLeaderChange = (leaderId) => {
    const leader = operationalTeam.find(m => m.id === leaderId);
    setFormData({
      ...formData,
      leader_id: leaderId,
      leader_name: leader?.name || ""
    });
  };

  const handleSaveFilter = (filter) => {
    const newFilters = [...savedFilters, filter];
    setSavedFilters(newFilters);
    localStorage.setItem("squads_filters", JSON.stringify(newFilters));
    toast.success("Filtro salvo com sucesso");
  };

  const handleDeleteFilter = (index) => {
    const newFilters = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newFilters);
    localStorage.setItem("squads_filters", JSON.stringify(newFilters));
  };

  const advancedSearchFields = [
    { key: "name", label: "Nome", type: "text", placeholder: "Nome do squad..." },
    { key: "leader", label: "Líder", type: "text", placeholder: "Nome do líder..." },
    { 
      key: "status", 
      label: "Status", 
      type: "select",
      options: [
        { value: "active", label: "Ativo" },
        { value: "inactive", label: "Inativo" }
      ]
    }
  ];

  const filteredSquads = squads
    .filter(squad => {
      // Busca básica
      const basicMatch = 
        squad.name?.toLowerCase().includes(search.toLowerCase()) ||
        squad.leader_name?.toLowerCase().includes(search.toLowerCase());
      
      if (!basicMatch && search) return false;

      // Filtros avançados
      if (advancedFilters.name && !squad.name?.toLowerCase().includes(advancedFilters.name.toLowerCase())) {
        return false;
      }
      if (advancedFilters.leader && !squad.leader_name?.toLowerCase().includes(advancedFilters.leader.toLowerCase())) {
        return false;
      }
      if (advancedFilters.status && squad.status !== advancedFilters.status) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "capacity") {
        aVal = (a.current_capacity / a.max_capacity) * 100;
        bVal = (b.current_capacity / b.max_capacity) * 100;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const getCapacityStatus = (current, max, warningThreshold, criticalThreshold) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return { status: "overloaded", label: "Sobrecarregado", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    if (percentage >= criticalThreshold) return { status: "critical", label: "Crítico", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
    if (percentage >= warningThreshold) return { status: "warning", label: "Atenção", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
    return { status: "healthy", label: "Saudável", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
  };

  const totalCapacity = squads.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
  const totalCurrent = squads.reduce((sum, s) => sum + (s.current_capacity || 0), 0);
  const overloadedSquads = squads.filter(s => (s.current_capacity / s.max_capacity) >= 1).length;
  const warningSquads = squads.filter(s => {
    const perc = (s.current_capacity / s.max_capacity) * 100;
    return perc >= (s.alert_threshold_warning || 80) && perc < 100;
  }).length;

  return (
    <>
      <AuditPageView pageName="Squads" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Squads Operacionais</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de capacidade e distribuição de contas</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setConfigDialogOpen(true)}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Configurar Saúde
          </Button>
          <Button onClick={handleOpenNew} className="bg-[#355340] hover:bg-[#355340]/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Squad
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Squads Ativos" 
          value={squads.filter(s => s.status === "active").length} 
          icon={Users} 
        />
        <StatsCard 
          title="Capacidade Total" 
          value={`${totalCurrent} / ${totalCapacity}`} 
          subtitle={`${totalCapacity > 0 ? ((totalCurrent/totalCapacity)*100).toFixed(0) : 0}% ocupado`}
          icon={TrendingUp} 
          iconClassName="bg-[#355340]" 
        />
        <StatsCard 
          title="Em Atenção" 
          value={warningSquads} 
          icon={AlertTriangle} 
          iconClassName="bg-amber-500" 
        />
        <StatsCard 
          title="Sobrecarregados" 
          value={overloadedSquads} 
          icon={AlertCircle} 
          iconClassName="bg-red-500" 
        />
      </div>

      {/* Search */}
      <Card className="border-slate-200">
        <CardContent className="pt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Busca rápida..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <AdvancedSearch
            fields={advancedSearchFields}
            onSearch={setAdvancedFilters}
            savedFilters={savedFilters}
            onSaveFilter={handleSaveFilter}
            onDeleteFilter={handleDeleteFilter}
          />
        </CardContent>
      </Card>

      {/* Squads Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filteredSquads.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title="Nenhum squad cadastrado"
              description="Crie um novo squad para começar a distribuir contas"
              actionLabel="Novo Squad"
              onAction={handleOpenNew}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSquads.map((squad) => {
            const squadClients = clients.filter(c => c.squad_id === squad.id);
            const currentCapacity = squadClients.length;
            const capacityPercentage = (currentCapacity / squad.max_capacity) * 100;
            const capacityInfo = getCapacityStatus(
              currentCapacity, 
              squad.max_capacity,
              squad.alert_threshold_warning || 80,
              squad.alert_threshold_critical || 90
            );

            return (
              <Card key={squad.id} className={`border-2 ${capacityInfo.border} hover:shadow-lg transition-all`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">{squad.name}</CardTitle>
                        {healthScores[squad.id] && (
                          <SquadHealthBadge
                            status={healthScores[squad.id].health_status}
                            score={healthScores[squad.id].overall_score}
                            onClick={() => {
                              setSelectedHealthScore(healthScores[squad.id]);
                              setHealthDetailsOpen(true);
                            }}
                          />
                        )}
                      </div>
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-3 w-3 text-[#355340]" />
                          <p className="text-xs text-slate-600 font-medium">{squad.leader_name || "Sem líder"}</p>
                        </div>
                        {squad.member_ids && squad.member_ids.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-slate-400" />
                            <p className="text-xs text-slate-500">
                              +{squad.member_ids.length} {squad.member_ids.length === 1 ? 'membro' : 'membros'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={`${capacityInfo.bg} ${capacityInfo.color} border-0`}>
                      {capacityInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Capacity Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Capacidade</span>
                      <span className="font-semibold">
                        {currentCapacity} / {squad.max_capacity}
                      </span>
                    </div>
                    <Progress 
                      value={capacityPercentage} 
                      className={`h-2 ${
                        capacityInfo.status === 'overloaded' ? '[&>div]:bg-red-500' :
                        capacityInfo.status === 'critical' ? '[&>div]:bg-orange-500' :
                        capacityInfo.status === 'warning' ? '[&>div]:bg-amber-500' :
                        '[&>div]:bg-emerald-500'
                      }`}
                    />
                    <p className="text-xs text-slate-500">
                      {capacityPercentage.toFixed(0)}% da capacidade
                    </p>
                  </div>

                  {/* Alerts */}
                  {capacityInfo.status !== 'healthy' && (
                    <div className={`${capacityInfo.bg} ${capacityInfo.color} p-3 rounded-lg flex items-start gap-2`}>
                      {capacityInfo.status === 'overloaded' ? (
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs font-medium">
                        {capacityInfo.status === 'overloaded' 
                          ? "Squad acima da capacidade máxima" 
                          : `${capacityPercentage.toFixed(0)}% da capacidade utilizada`}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-slate-500">Membros</p>
                      <p className="text-lg font-bold text-slate-900">
                        {(squad.member_ids?.length || 0) + (squad.leader_id ? 1 : 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Contas Ativas</p>
                      <p className="text-lg font-bold text-slate-900">
                        {squadClients.filter(c => c.status === 'active').length}
                      </p>
                    </div>
                    </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedSquad(squad);
                        setHistoryDialogOpen(true);
                      }}
                    >
                      <History className="h-3 w-3 mr-1" />
                      Histórico
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenEdit(squad)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja deletar o squad "${squad.name}"?`)) {
                          deleteMutation.mutate(squad.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSquad ? "Editar Squad" : "Novo Squad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Squad *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Squad Alpha"
                />
              </div>
              <div>
                <Label>Líder do Squad</Label>
                <Select value={formData.leader_id} onValueChange={handleLeaderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um líder" />
                  </SelectTrigger>
                  <SelectContent>
                    {operationalTeam.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Capacidade Máxima *</Label>
                <Input
                  type="number"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                  placeholder="10"
                  min="1"
                />
              </div>
              <div>
                <Label>Alerta Atenção (%)</Label>
                <Input
                  type="number"
                  value={formData.alert_threshold_warning}
                  onChange={(e) => setFormData({ ...formData, alert_threshold_warning: parseInt(e.target.value) })}
                  placeholder="80"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label>Alerta Crítico (%)</Label>
                <Input
                  type="number"
                  value={formData.alert_threshold_critical}
                  onChange={(e) => setFormData({ ...formData, alert_threshold_critical: parseInt(e.target.value) })}
                  placeholder="90"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o foco e responsabilidades deste squad..."
                rows={3}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <SquadMembersManager 
                squad={formData} 
                onUpdate={handleMembersUpdate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.max_capacity}
              className="bg-[#355340] hover:bg-[#355340]/90"
            >
              {editingSquad ? "Atualizar" : "Criar"} Squad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SquadHealthDetails
        open={healthDetailsOpen}
        onOpenChange={setHealthDetailsOpen}
        score={selectedHealthScore}
      />

      <SquadHealthConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      />

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Movimentações - {selectedSquad?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="py-12 text-center">
                <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{item.client_name}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        De: <span className="font-medium">{item.from_squad_name || "Sem squad"}</span>
                        {" → "}
                        Para: <span className="font-medium">{item.to_squad_name}</span>
                      </p>
                      {item.reason && (
                        <p className="text-xs text-slate-500 mt-2">{item.reason}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {new Date(item.movement_date || item.created_date).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{item.moved_by_name}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}