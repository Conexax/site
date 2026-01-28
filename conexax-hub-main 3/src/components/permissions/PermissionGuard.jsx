import React from "react";
import { usePermissions } from "@/components/permissions/usePermissions";
import { AlertCircle } from "lucide-react";

export default function PermissionGuard({ 
  entity, 
  action, 
  children, 
  fallback = null,
  showMessage = false 
}) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(entity, action)) {
    if (showMessage) {
      return (
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Acesso Negado</p>
          <p className="text-slate-500 text-sm mt-1">
            Você não tem permissão para executar esta ação
          </p>
        </div>
      );
    }
    return fallback;
  }

  return <>{children}</>;
}