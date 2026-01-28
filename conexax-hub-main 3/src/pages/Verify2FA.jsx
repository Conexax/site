import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Mail, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Verify2FA() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Se não tem 2FA habilitado ou já verificou, redirecionar
        const verified = sessionStorage.getItem(`2fa_verified_${userData.id}`);
        if (!userData?.twoFactorEnabled || verified) {
          navigate(createPageUrl("Dashboard"));
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('validate2FACode', {
        userId: user.id,
        code: code
      });

      if (response.data.success) {
        // Marcar como verificado na sessão
        sessionStorage.setItem(`2fa_verified_${user.id}`, 'true');
        toast.success('Autenticação concluída!');
        navigate(createPageUrl("Dashboard"));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Código inválido');
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    try {
      const response = await base44.functions.invoke('generate2FACode', {
        userId: user.id,
        email: user.email
      });

      if (response.data.success) {
        toast.success('Novo código enviado para seu e-mail');
        setResendCooldown(60);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao reenviar código');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-[#355340]/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-[#355340]" />
          </div>
          <CardTitle className="text-2xl">Verificação em Duas Etapas</CardTitle>
          <CardDescription>
            Enviamos um código de 6 dígitos para {user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono h-14"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-slate-500 text-center mt-2">
                O código expira em 10 minutos
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#355340] hover:bg-[#355340]/90 h-11"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">ou</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reenviando...
                </>
              ) : resendCooldown > 0 ? (
                `Reenviar em ${resendCooldown}s`
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Reenviar Código
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              Após 5 tentativas incorretas, você precisará solicitar um novo código
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}