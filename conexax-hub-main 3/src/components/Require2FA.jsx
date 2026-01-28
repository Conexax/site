import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function Require2FA({ children }) {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // Se tem 2FA habilitado, verificar apenas se ainda não foi verificado nesta sessão
        if (userData?.twoFactorEnabled) {
          const verified = sessionStorage.getItem(`2fa_verified_${userData.id}`);
          const justLoggedIn = sessionStorage.getItem('just_logged_in');
          
          // Só pede verificação se acabou de fazer login E ainda não verificou
          if (justLoggedIn && !verified) {
            // Limpar flag de login
            sessionStorage.removeItem('just_logged_in');
            
            // Gerar e enviar código
            try {
              await base44.functions.invoke('generate2FACode', {
                userId: userData.id,
                email: userData.email
              });
            } catch (err) {
              console.error('Erro ao gerar código:', err);
            }
            
            // Redirecionar para verificação
            navigate(createPageUrl("Verify2FA"));
            return;
          }
        }

        setChecking(false);
      } catch (error) {
        setChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#355340]" />
      </div>
    );
  }

  return children;
}