import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Plus,
  Search,
  UserCircle,
  MoreVertical,
  Pencil,
  Shield,
  Briefcase,
  Users,
  Eye,
  Trash2,
  Mail,
  Clock,
  CheckCircle
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/ui/StatusBadge";
import StatsCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AuditPageView } from "@/components/audit/AuditLogger";

const roleLabels = {
  admin: "Administrador",
  user: "Usuário"
};

const roleIcons = {
  admin: Shield,
  user: UserCircle
};

export default function UsersManagement() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteCode, setDeleteCode] = useState("");
  const [codeExpiry, setCodeExpiry] = useState(null);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "user",
    custom_role_ids: []
  });
  const [editData, setEditData] = useState({
    full_name: "",
    role: "user",
    custom_role_ids: []
  });
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.filter({ status: "active" }),
  });

  const isAdmin = currentUser?.role === "admin";

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ["pendingInvites"],
    queryFn: () => base44.entities.UserInvite.filter({ status: "pending" }),
    enabled: isAdmin,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role, custom_role_ids }) => {
      if (!email || !currentUser) {
        throw new Error("Dados inválidos");
      }

      const selectedRoles = customRoles.filter(r => custom_role_ids?.includes(r.id));
      
      // Registrar convite pendente
      try {
        await base44.entities.UserInvite.create({
          email,
          role,
          custom_role_ids: custom_role_ids || [],
          custom_role_names: selectedRoles.map(r => r.name),
          status: "pending",
          invited_by: currentUser.email,
          invited_by_name: currentUser.full_name
        });
      } catch (e) {
        console.error('Failed to create invite record:', e);
      }
      
      // Enviar convite
      await base44.users.inviteUser(email, role);
      
      // Auditoria detalhada
      try {
        await base44.functions.invoke('auditAuth', {
          action: 'INVITE_USER',
          result: 'success',
          user_email: currentUser.email,
          metadata: { 
            invited_email: email, 
            role, 
            custom_role_ids: custom_role_ids || [],
            custom_role_names: selectedRoles.map(r => r.name),
            invited_by: currentUser.email,
            invited_by_name: currentUser.full_name,
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) {
        console.error('Audit failed:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvites"] });
      toast.success("Usuário convidado com sucesso!");
      handleCloseDialog();
    },
    onError: async (error) => {
      console.error('Invite error:', error);
      toast.error(`Erro ao convidar usuário: ${error.message}`);
      
      // Auditoria de erro
      try {
        await base44.functions.invoke('auditAuth', {
          action: 'INVITE_USER',
          result: 'error',
          error_message: error.message,
          user_email: currentUser?.email,
          metadata: { 
            attempted_email: inviteData.email, 
            attempted_role: inviteData.role,
            error_stack: error.stack,
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) {
        console.error('Audit failed:', e);
      }
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (!id || !data || !currentUser) {
        throw new Error("Dados inválidos");
      }

      const currentUserData = users.find(u => u.id === id);
      const selectedRoles = data.custom_role_ids ? customRoles.filter(r => data.custom_role_ids.includes(r.id)) : [];
      const updateData = {
        full_name: data.full_name,
        role: data.role,
        custom_role_ids: data.custom_role_ids || [],
        custom_role_names: selectedRoles.map(r => r.name)
      };
      
      // Atualizar usuário (se for admin ou o próprio usuário)
      if (currentUser.role === 'admin') {
        await base44.entities.User.update(id, updateData);
      } else if (currentUser.id === id) {
        // Usuário pode atualizar apenas seu próprio nome
        await base44.auth.updateMe({ full_name: data.full_name });
      } else {
        throw new Error("Sem permissão para editar este usuário");
      }
      
      const permissionsChanged = JSON.stringify(currentUserData?.custom_role_ids || []) !== JSON.stringify(data.custom_role_ids);
      
      // Notificar sobre mudanças de permissão
      if (permissionsChanged && id !== currentUser.id && currentUser.role === 'admin') {
        try {
          await base44.entities.Notification.create({
            user_id: id,
            title: "Suas Permissões Foram Alteradas",
            message: `${currentUser.full_name} atualizou seus perfis de acesso. Novos perfis: ${updateData.custom_role_names.join(", ") || "Nenhum"}`,
            type: "info",
            category: "permissions",
            metadata: { 
              changed_by: currentUser.email,
              old_roles: currentUserData?.custom_role_names || [],
              new_roles: updateData.custom_role_names 
            }
          });
        } catch (e) {
          console.error('Failed to create notification:', e);
        }
      }
      
      // Auditoria detalhada com campos alterados
      try {
        const changedFields = [];
        if (currentUserData?.full_name !== data.full_name) {
          changedFields.push({
            field: 'full_name',
            old_value: currentUserData?.full_name,
            new_value: data.full_name
          });
        }
        if (currentUserData?.role !== data.role) {
          changedFields.push({
            field: 'role',
            old_value: currentUserData?.role,
            new_value: data.role
          });
        }
        if (permissionsChanged) {
          changedFields.push({
            field: 'custom_role_ids',
            old_value: currentUserData?.custom_role_ids || [],
            new_value: data.custom_role_ids || []
          });
          changedFields.push({
            field: 'custom_role_names',
            old_value: currentUserData?.custom_role_names || [],
            new_value: selectedRoles.map(r => r.name)
          });
        }

        await base44.functions.invoke('auditAuth', {
          action: 'UPDATE_USER',
          result: 'success',
          user_email: currentUser?.email,
          metadata: { 
            updated_user_id: id,
            updated_user_email: currentUserData?.email,
            updated_user_name: currentUserData?.full_name,
            changed_fields: changedFields,
            changes_count: changedFields.length,
            before: {
              full_name: currentUserData?.full_name,
              role: currentUserData?.role,
              custom_role_ids: currentUserData?.custom_role_ids || [],
              custom_role_names: currentUserData?.custom_role_names || []
            },
            after: updateData,
            changes_summary: {
              name_changed: currentUserData?.full_name !== data.full_name,
              role_changed: currentUserData?.role !== data.role,
              profiles_changed: permissionsChanged
            },
            timestamp: new Date().toISOString(),
            performed_by: currentUser.email,
            performed_by_name: currentUser.full_name
          }
        });
      } catch (e) {
        console.error('Audit failed:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário atualizado com sucesso!");
      handleCloseEditDialog();
    },
    onError: async (error) => {
      console.error('Update user error:', error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
      
      // Auditoria de erro
      try {
        await base44.functions.invoke('auditAuth', {
          action: 'UPDATE_USER',
          result: 'error',
          error_message: error.message,
          user_email: currentUser?.email,
          metadata: { 
            attempted_update_user_id: editingUser?.id,
            attempted_update_user_email: editingUser?.email,
            attempted_changes: editData,
            error_stack: error.stack,
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) {
        console.error('Audit failed:', e);
      }
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, code }) => {
      if (!userId || !code || !currentUser) {
        throw new Error("Dados inválidos");
      }

      // Validar código 2FA
      const validation = await base44.functions.invoke('validate2FACode', { 
        userId: currentUser.id, 
        code 
      });
      
      if (!validation.data.valid) {
        throw new Error("Código inválido ou expirado");
      }

      const deletedUser = users.find(u => u.id === userId);
      
      // Apenas admin pode deletar usuários
      if (currentUser.role !== 'admin') {
        throw new Error("Sem permissão para excluir usuários");
      }

      await base44.entities.User.delete(userId);
      
      // Auditoria detalhada
      try {
        await base44.functions.invoke('auditAuth', {
          action: 'DELETE_USER',
          result: 'success',
          user_email: currentUser?.email,
          metadata: { 
            deleted_user_id: userId, 
            deleted_user_email: deletedUser?.email,
            deleted_user_name: deletedUser?.full_name,
            deleted_user_role: deletedUser?.role,
            deleted_user_custom_roles: deletedUser?.custom_role_names || [],
            verification_method: '2FA',
            verification_code_used: true,
            timestamp: new Date().toISOString(),
            performed_by: currentUser.email,
            performed_by_name: currentUser.full_name
          }
        });
      } catch (e) {
        console.error('Audit failed:', e);
      }

      // Notificar outros admins
      try {
        const admins = users.filter(u => u.role === 'admin' && u.id !== currentUser.id);
        await Promise.all(admins.map(admin =>
          base44.entities.Notification.create({
            user_id: admin.id,
            title: "Usuário Excluído",
            message: `${currentUser.full_name} excluiu o usuário ${deletedUser?.full_name || deletedUser?.email}`,
            type: "warning",
            category: "user_management",
            metadata: { deleted_user_id: userId, deleted_by: currentUser.email }
          })
        ));
      } catch (e) {
        console.error('Failed to notify admins:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário excluído com sucesso!");
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      setDeleteCode("");
    },
    onError: async (error) => {
      console.error('Delete user error:', error);
      toast.error(`Erro ao excluir usuário: ${error.message}`);
      
      // Auditoria de erro detalhada
      try {
        await base44.functions.invoke('auditAuth', {
          action: 'DELETE_USER',
          result: 'error',
          error_message: error.message,
          user_email: currentUser?.email,
          metadata: { 
            attempted_delete_user_id: deletingUser?.id,
            attempted_delete_user_email: deletingUser?.email,
            attempted_delete_user_name: deletingUser?.full_name,
            verification_code_provided: deleteCode?.length === 6,
            error_type: error.message.includes('Código') ? 'invalid_2fa_code' : 'deletion_failed',
            error_stack: error.stack,
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) {
        console.error('Audit failed:', e);
      }
      
      // Notificar admins sobre falha
      try {
        const admins = users.filter(u => u.role === 'admin');
        await Promise.all(admins.map(admin =>
          base44.entities.Notification.create({
            user_id: admin.id,
            title: "Falha na Exclusão de Usuário",
            message: `${currentUser?.full_name || 'Um admin'} tentou excluir ${deletingUser?.full_name || deletingUser?.email} mas falhou: ${error.message}`,
            type: "error",
            category: "security",
            metadata: { 
              attempted_user_id: deletingUser?.id, 
              error: error.message,
              timestamp: new Date().toISOString()
            }
          })
        ));
      } catch (e) {
        console.error('Failed to notify admins about error:', e);
      }
    }
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setInviteData({ email: "", role: "user", custom_role_ids: [] });
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingUser(null);
    setEditData({ full_name: "", role: "user", custom_role_ids: [] });
  };

  const handleInvite = () => {
    inviteMutation.mutate(inviteData);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditData({
      full_name: user.full_name || "",
      role: user.role,
      custom_role_ids: user.custom_role_ids || []
    });
    setEditDialogOpen(true);
  };

  const toggleRole = (roleId, isInvite = false) => {
    const data = isInvite ? inviteData : editData;
    const setter = isInvite ? setInviteData : setEditData;
    
    const currentIds = data.custom_role_ids || [];
    const newIds = currentIds.includes(roleId)
      ? currentIds.filter(id => id !== roleId)
      : [...currentIds, roleId];
    
    setter({ ...data, custom_role_ids: newIds });
  };

  const handleUpdateUser = () => {
    if (!editData.full_name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    updateUserMutation.mutate({ id: editingUser.id, data: editData });
  };

  const handleOpenDeleteConfirm = async (user) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
    setDeleteCode("");
    
    // Gerar código 2FA
    try {
      const result = await base44.functions.invoke('generate2FACode', {
        userId: currentUser.id
      });
      setCodeExpiry(result.data.expiresAt);
      toast.success("Código de verificação enviado para seu e-mail!");
    } catch (error) {
      toast.error("Erro ao gerar código de verificação");
      setDeleteDialogOpen(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteCode.trim()) {
      toast.error("Digite o código de verificação");
      return;
    }
    deleteUserMutation.mutate({ userId: deletingUser.id, code: deleteCode });
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter(u => u.role === "admin").length;
  const userCount = users.filter(u => u.role === "user").length;

  return (
    <>
      <AuditPageView pageName="UsersManagement" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie os usuários do sistema</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="bg-[#355340] hover:bg-[#355340]/90">
            <Plus className="h-4 w-4 mr-2" />
            Convidar Usuário
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total de Usuários" value={users.length} icon={Users} />
        <StatsCard title="Administradores" value={adminCount} icon={Shield} iconClassName="bg-[#355340]" />
        <StatsCard title="Usuários" value={userCount} icon={UserCircle} iconClassName="bg-blue-500" />
        {isAdmin && (
          <StatsCard 
            title="Convites Pendentes" 
            value={pendingInvites.length} 
            icon={Mail} 
            iconClassName="bg-amber-500" 
          />
        )}
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar usuário..."
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
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {isAdmin && pendingInvites.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-slate-900">Convites Pendentes</h3>
              </div>
              <span className="text-sm text-amber-700">
                {pendingInvites.length} {pendingInvites.length === 1 ? 'convite aguardando' : 'convites aguardando'} aceitação
              </span>
            </div>
            <div className="space-y-2">
              {pendingInvites.slice(0, 5).map((invite) => (
                <div key={invite.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{invite.email}</p>
                      <p className="text-xs text-slate-500">
                        {roleLabels[invite.role]} • Convidado por {invite.invited_by_name} em {new Date(invite.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-amber-700 font-medium">Pendente</span>
                </div>
              ))}
              {pendingInvites.length > 5 && (
                <p className="text-xs text-center text-slate-500 pt-2">
                  + {pendingInvites.length - 5} convites não exibidos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={UserCircle}
              title="Nenhum usuário encontrado"
              description="Convide usuários para o sistema"
              actionLabel={isAdmin ? "Convidar Usuário" : undefined}
              onAction={isAdmin ? () => setDialogOpen(true) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Função</TableHead>
                    {isAdmin && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const RoleIcon = roleIcons[user.role] || UserCircle;
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                              <span className="text-slate-600 font-semibold text-sm">
                                {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {user.full_name || "Sem nome"}
                              </p>
                              {user.id === currentUser?.id && (
                                <span className="text-xs text-[#355340]">(Você)</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600">{user.email}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RoleIcon className="h-4 w-4 text-slate-500" />
                            <div>
                              <span className={`text-sm font-medium ${
                                user.role === "admin" ? "text-[#355340]" : "text-slate-600"
                              }`}>
                                {roleLabels[user.role] || user.role}
                              </span>
                              {user.custom_role_names && user.custom_role_names.length > 0 && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {user.custom_role_names.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(user)}
                            >
                              <Pencil className="h-4 w-4 text-slate-500" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá um e-mail com as instruções de acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <Label>Função *</Label>
              <Select value={inviteData.role} onValueChange={(v) => setInviteData({ ...inviteData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inviteData.role === "user" && customRoles.length > 0 && (
              <div>
                <Label>Perfis Customizados (Opcional)</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {customRoles.map(role => (
                    <div key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`invite-role-${role.id}`}
                        checked={inviteData.custom_role_ids.includes(role.id)}
                        onChange={() => toggleRole(role.id, true)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <label 
                        htmlFor={`invite-role-${role.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {role.name}
                        {role.description && (
                          <span className="text-xs text-slate-500 block">{role.description}</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                {inviteData.custom_role_ids.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {inviteData.custom_role_ids.length} {inviteData.custom_role_ids.length === 1 ? 'perfil selecionado' : 'perfis selecionados'}
                  </p>
                )}
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
              <p className="font-medium mb-2">Níveis de acesso:</p>
              <ul className="space-y-1">
                <li><strong>Administrador:</strong> Acesso total ao sistema</li>
                <li><strong>Usuário:</strong> Acesso conforme perfil customizado ou padrão</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleInvite} 
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={!inviteData.email || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Enviando..." : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={editData.full_name}
                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Função *</Label>
              <Select value={editData.role} onValueChange={(v) => setEditData({ ...editData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editData.role === "user" && customRoles.length > 0 && (
              <div>
                <Label>Perfis Customizados (Opcional)</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {customRoles.map(role => (
                    <div key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`edit-role-${role.id}`}
                        checked={editData.custom_role_ids.includes(role.id)}
                        onChange={() => toggleRole(role.id, false)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <label 
                        htmlFor={`edit-role-${role.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {role.name}
                        {role.description && (
                          <span className="text-xs text-slate-500 block">{role.description}</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                {editData.custom_role_ids.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {editData.custom_role_ids.length} {editData.custom_role_ids.length === 1 ? 'perfil selecionado' : 'perfis selecionados'}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isAdmin && editingUser?.id !== currentUser?.id && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  setEditDialogOpen(false);
                  handleOpenDeleteConfirm(editingUser);
                }}
                className="sm:mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Usuário
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleCloseEditDialog} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateUser} 
                className="bg-[#355340] hover:bg-[#355340]/90 flex-1 sm:flex-none"
                disabled={!editData.full_name.trim() || updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog with 2FA */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Digite o código de verificação enviado para seu e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong> Você está prestes a excluir o usuário{" "}
                <strong>{deletingUser?.full_name || deletingUser?.email}</strong>
              </p>
            </div>
            <div>
              <Label>Código de Verificação (6 dígitos) *</Label>
              <Input
                type="text"
                maxLength={6}
                value={deleteCode}
                onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-lg tracking-widest"
              />
              <p className="text-xs text-slate-500 mt-1">
                Verifique seu e-mail para o código de verificação
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteCode.length !== 6 || deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}