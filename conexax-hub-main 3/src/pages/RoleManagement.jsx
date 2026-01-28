import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, Shield, Check, X, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";
import { AuditPageView } from "@/components/audit/AuditLogger";

const AVAILABLE_ENTITIES = [
  { key: "Client", label: "Clientes" },
  { key: "Lead", label: "Leads" },
  { key: "Contract", label: "Contratos" },
  { key: "Squad", label: "Squads" },
  { key: "Activity", label: "Atividades" },
  { key: "Metric", label: "Métricas" },
  { key: "User", label: "Usuários" },
  { key: "CommercialTeamMember", label: "Equipe Comercial" },
  { key: "OperationalTeamMember", label: "Equipe Operacional" },
  { key: "OTEModel", label: "Modelos OTE" },
  { key: "OTECalculation", label: "Cálculos OTE" },
  { key: "Plan", label: "Planos" },
  { key: "ContractTemplate", label: "Modelos de Contrato" },
  { key: "GeneratedContract", label: "Contratos Gerados" }
];

const ACTIONS = [
  { key: "view", label: "Visualizar", color: "text-blue-600" },
  { key: "create", label: "Criar", color: "text-emerald-600" },
  { key: "update", label: "Editar", color: "text-amber-600" },
  { key: "delete", label: "Excluir", color: "text-red-600" },
  { key: "export", label: "Exportar", color: "text-purple-600" }
];

export default function RoleManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {}
  });

  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Role.create(data);
      
      // Auditoria detalhada
      await base44.functions.invoke('auditAuth', {
        action: 'CREATE_ROLE',
        result: 'success',
        user_email: currentUser?.email,
        metadata: {
          role_id: result.id,
          role_name: data.name,
          permissions_count: countPermissions(data.permissions),
          permissions: data.permissions
        }
      }).catch(e => console.error('Audit failed:', e));
      
      // Notificar todos os admins sobre novo perfil
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin' && u.id !== currentUser.id);
      await Promise.all(admins.map(admin =>
        base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          title: "Novo Perfil Criado",
          message: `${currentUser.full_name} criou o perfil "${data.name}" com ${countPermissions(data.permissions)} permissões`,
          type: "success",
          category: "roles",
          metadata: { role_id: result.id, role_name: data.name, created_by: currentUser.email }
        })
      ));
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDialogOpen(false);
      resetForm();
      toast.success("Perfil criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar perfil: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, beforeData }) => {
      await base44.entities.Role.update(id, data);
      
      // Auditoria detalhada de alterações
      await base44.functions.invoke('auditAuth', {
        action: 'UPDATE_ROLE',
        result: 'success',
        user_email: currentUser?.email,
        metadata: {
          role_id: id,
          role_name: data.name,
          before: {
            name: beforeData.name,
            description: beforeData.description,
            status: beforeData.status,
            permissions_count: countPermissions(beforeData.permissions)
          },
          after: {
            name: data.name,
            description: data.description,
            status: data.status,
            permissions_count: countPermissions(data.permissions)
          },
          permissions_changed: JSON.stringify(beforeData.permissions) !== JSON.stringify(data.permissions)
        }
      }).catch(e => console.error('Audit failed:', e));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
      resetForm();
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar perfil: " + error.message);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus, roleName }) => {
      await base44.entities.Role.update(id, { status: newStatus });
      
      // Auditoria
      await base44.functions.invoke('auditAuth', {
        action: newStatus === 'active' ? 'ACTIVATE_ROLE' : 'DEACTIVATE_ROLE',
        result: 'success',
        user_email: currentUser?.email,
        metadata: { role_id: id, role_name: roleName }
      }).catch(e => console.error('Audit failed:', e));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(variables.newStatus === 'active' ? "Perfil ativado" : "Perfil desativado");
    },
    onError: (error) => {
      toast.error("Erro ao alterar status: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleData) => {
      await base44.entities.Role.delete(roleData.id);
      
      // Auditoria
      await base44.functions.invoke('auditAuth', {
        action: 'DELETE_ROLE',
        result: 'success',
        user_email: currentUser?.email,
        metadata: {
          role_id: roleData.id,
          role_name: roleData.name,
          permissions_count: countPermissions(roleData.permissions)
        }
      }).catch(e => console.error('Audit failed:', e));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Perfil excluído com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir perfil: " + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: {}
    });
    setEditingRole(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || {}
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Nome do perfil é obrigatório");
      return;
    }

    const data = {
      ...formData,
      status: "active"
    };

    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data, beforeData: editingRole });
    } else {
      createMutation.mutate(data);
    }
  };

  const handlePermissionChange = (entity, action, value) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [entity]: {
          ...(formData.permissions[entity] || {}),
          [action]: value
        }
      }
    });
  };

  const handleToggleAllForEntity = (entity, value) => {
    const allActions = {};
    ACTIONS.forEach(action => {
      allActions[action.key] = value;
    });
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [entity]: allActions
      }
    });
  };

  const countPermissions = (perms) => {
    if (!perms) return 0;
    let count = 0;
    Object.values(perms).forEach(entityPerms => {
      Object.values(entityPerms).forEach(value => {
        if (value) count++;
      });
    });
    return count;
  };

  return (
    <>
      <AuditPageView pageName="RoleManagement" />
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Perfis</h1>
            <p className="text-slate-500 text-sm mt-1">
              Configure perfis e permissões customizadas
            </p>
          </div>
          <Button onClick={handleOpenNew} className="bg-[#355340] hover:bg-[#355340]/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Perfil
          </Button>
        </div>

        {/* Roles Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : roles.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Shield}
                title="Nenhum perfil cadastrado"
                description="Crie perfis customizados para controlar permissões"
                actionLabel="Novo Perfil"
                onAction={handleOpenNew}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Card key={role.id} className="border-slate-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[#355340]" />
                        {role.name}
                      </CardTitle>
                      {role.description && (
                        <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                      )}
                    </div>
                    <Badge 
                      className={
                        role.status === "active" 
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }
                    >
                      {role.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Permissões configuradas</span>
                    <span className="font-semibold text-[#355340]">
                      {countPermissions(role.permissions)}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(role)}
                      disabled={role.is_system}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={role.status === 'active' ? 'text-amber-600' : 'text-emerald-600'}
                      onClick={() => {
                        toggleStatusMutation.mutate({
                          id: role.id,
                          newStatus: role.status === 'active' ? 'inactive' : 'active',
                          roleName: role.name
                        });
                      }}
                      disabled={role.is_system}
                    >
                      <Power className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Excluir permanentemente o perfil "${role.name}"?\n\nEsta ação não pode ser desfeita. Considere desativar ao invés de excluir.`)) {
                          deleteMutation.mutate(role);
                        }
                      }}
                      disabled={role.is_system}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Editar Perfil" : "Novo Perfil"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Perfil *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Gerente Comercial"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Breve descrição do perfil"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Permissões por Entidade</Label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                    <strong>Sistema de Herança:</strong> As permissões deste perfil serão <strong>somadas</strong> às permissões base do usuário. 
                    Usuários com perfis customizados herdam permissões básicas de leitura + as permissões específicas definidas aqui.
                  </div>
                </div>

                <div className="space-y-3">
                  {AVAILABLE_ENTITIES.map((entity) => {
                    const entityPerms = formData.permissions[entity.key] || {};
                    const hasAnyPermission = ACTIONS.some(a => entityPerms[a.key]);

                    return (
                      <Card key={entity.key} className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-slate-900">{entity.label}</h4>
                              {hasAnyPermission && (
                                <Badge variant="secondary" className="h-5 text-xs">
                                  {ACTIONS.filter(a => entityPerms[a.key]).length} ativas
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleToggleAllForEntity(entity.key, !hasAnyPermission)}
                            >
                              {hasAnyPermission ? (
                                <>
                                  <X className="h-3 w-3 mr-1" />
                                  Desmarcar
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Marcar Todas
                                </>
                              )}
                            </Button>
                          </div>

                          <div className="grid grid-cols-5 gap-3">
                            {ACTIONS.map((action) => (
                              <div
                                key={action.key}
                                className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"
                              >
                                <Label className={`text-xs ${action.color} cursor-pointer flex-1`}>
                                  {action.label}
                                </Label>
                                <Switch
                                  checked={entityPerms[action.key] || false}
                                  onCheckedChange={(v) =>
                                    handlePermissionChange(entity.key, action.key, v)
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name.trim()}
                className="bg-[#355340] hover:bg-[#355340]/90"
              >
                {editingRole ? "Atualizar" : "Criar"} Perfil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}