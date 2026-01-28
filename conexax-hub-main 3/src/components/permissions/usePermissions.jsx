import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // Admin tem todas as permissões (herança completa)
        if (userData.role === "admin") {
          setRole({ name: "Admin", permissions: {}, isAdmin: true });
          setLoading(false);
          return;
        }

        // Permissões base para usuário comum
        const basePermissions = {
          // Permissões padrão de leitura para usuário
          Client: { view: true },
          Lead: { view: true },
          Contract: { view: true },
          Activity: { view: true, create: true }
        };

        // Carregar perfis customizados ativos
        if (userData.custom_role_ids && userData.custom_role_ids.length > 0) {
          const roles = await base44.entities.Role.list();
          const userRoles = roles.filter(r => 
            userData.custom_role_ids.includes(r.id) && r.status === "active"
          );
          
          // Mesclar permissões: base + perfis customizados (união/herança)
          const mergedPermissions = JSON.parse(JSON.stringify(basePermissions));
          
          userRoles.forEach(userRole => {
            if (userRole.permissions) {
              Object.keys(userRole.permissions).forEach(entity => {
                if (!mergedPermissions[entity]) {
                  mergedPermissions[entity] = {};
                }
                Object.keys(userRole.permissions[entity]).forEach(action => {
                  // Herança aditiva: qualquer permissão true prevalece
                  if (userRole.permissions[entity][action]) {
                    mergedPermissions[entity][action] = true;
                  }
                });
              });
            }
          });
          
          setRole({ 
            name: userRoles.map(r => r.name).join(", "), 
            permissions: mergedPermissions,
            customRoleCount: userRoles.length
          });
        } else {
          // Sem perfis customizados, usar apenas permissões base
          setRole({ 
            name: "Usuário Padrão", 
            permissions: basePermissions 
          });
        }
      } catch (error) {
        console.error("Error loading permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const hasPermission = (entity, action) => {
    if (!user || !role) return false;
    
    // Admin tem todas as permissões (herança total)
    if (user.role === "admin" || role.isAdmin) return true;

    // Verificar permissão específica (herdada ou customizada)
    return role.permissions?.[entity]?.[action] === true;
  };

  const canViewEntity = (entity) => hasPermission(entity, "view");
  const canCreateEntity = (entity) => hasPermission(entity, "create");
  const canUpdateEntity = (entity) => hasPermission(entity, "update");
  const canDeleteEntity = (entity) => hasPermission(entity, "delete");
  const canExportEntity = (entity) => hasPermission(entity, "export");

  const isAdmin = user?.role === "admin";

  return {
    user,
    role,
    loading,
    hasPermission,
    canViewEntity,
    canCreateEntity,
    canUpdateEntity,
    canDeleteEntity,
    canExportEntity,
    isAdmin
  };
}