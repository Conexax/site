import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getDomainConfig, canAccessPage } from "./DomainConfig";
import { createPageUrl } from "@/utils";

export default function DomainGuard({ children, currentPageName }) {
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        const config = getDomainConfig();
        const hasAccess = canAccessPage(currentPageName, userData.role);

        if (!hasAccess) {
          console.warn(`Acesso negado: ${userData.full_name} (${userData.role}) não pode acessar ${currentPageName}`);
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error("Erro ao verificar autorização:", error);
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, [currentPageName]);

  if (isAuthorized === null) {
    return <div className="min-h-screen flex items-center justify-center">Verificando acesso...</div>;
  }

  if (isAuthorized === false) {
    const config = getDomainConfig();
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-slate-900">Acesso Negado</h1>
          <p className="text-slate-600">
            Você não tem permissão para acessar o módulo de <strong>{config.name}</strong>.
          </p>
          {user && (
            <p className="text-sm text-slate-500">
              Seu perfil: <strong>{user.role}</strong>
            </p>
          )}
          <div className="pt-4">
            <a
              href={createPageUrl("Dashboard")}
              className="inline-block bg-[#355340] text-white px-4 py-2 rounded-lg hover:bg-[#355340]/90"
            >
              Voltar ao Hub
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}