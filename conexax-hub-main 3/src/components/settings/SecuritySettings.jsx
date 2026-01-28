import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Lock, Key, Mail, AlertTriangle, CheckCircle2, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SecuritySettings() {
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const send2FACodeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generate2FACode', {
        userId: user.id,
        email: user.email
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Código enviado para ' + user.email);
      setShow2FADialog(true);
      setResendCooldown(60);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Erro ao enviar código');
    }
  });

  const verify2FACodeMutation = useMutation({
    mutationFn: async (code) => {
      const response = await base44.functions.invoke('validate2FACode', {
        userId: user.id,
        code: code
      });
      return response.data;
    },
    onSuccess: async () => {
      await base44.auth.updateMe({ twoFactorEnabled: true });
      toast.success('2FA ativado com sucesso!');
      setShow2FADialog(false);
      setVerificationCode("");
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Código inválido');
      setVerificationCode("");
    }
  });

  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({ twoFactorEnabled: false });
    },
    onSuccess: () => {
      toast.success('2FA desativado com sucesso');
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: (error) => {
      toast.error('Erro ao desativar 2FA');
    }
  });

  const handle2FAToggle = (checked) => {
    if (checked) {
      send2FACodeMutation.mutate();
    } else {
      disable2FAMutation.mutate();
    }
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }
    verify2FACodeMutation.mutate(verificationCode);
  };

  const handleResendCode = () => {
    if (resendCooldown > 0) return;
    send2FACodeMutation.mutate();
  };

  const handleCancelVerification = () => {
    setShow2FADialog(false);
    setVerificationCode("");
    setResendCooldown(0);
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('changePassword', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
      setShowPasswordDialog(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Erro ao alterar senha');
    }
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres');
      return;
    }

    changePasswordMutation.mutate(passwordForm);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Segurança</h1>
        <p className="text-slate-500 mt-1">Gerencie configurações de segurança e autenticação</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5 text-[#355340]" />
            Autenticação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">Email de Login</p>
              <p className="text-sm text-slate-500">{user?.email || "Carregando..."}</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">Verificado</Badge>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">Autenticação de Dois Fatores (E-mail)</p>
              <p className="text-sm text-slate-500">
                {user?.twoFactorEnabled 
                  ? 'Código será enviado para seu e-mail a cada login' 
                  : 'Adicione uma camada extra de segurança'}
              </p>
            </div>
            <Switch 
              checked={user?.twoFactorEnabled || false} 
              onCheckedChange={handle2FAToggle}
              disabled={send2FACodeMutation.isPending || disable2FAMutation.isPending}
            />
          </div>
          {send2FACodeMutation.isPending && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando código de verificação...
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#355340]" />
            Sessões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tempo de Sessão (minutos)</Label>
            <Input
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Após este tempo de inatividade, você será desconectado automaticamente
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">Sessão Ativa</p>
              <p className="text-xs text-amber-700">Você está conectado neste dispositivo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#355340]" />
            Alterações de Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowPasswordDialog(true)}
          >
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de Verificação 2FA */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar E-mail</DialogTitle>
            <DialogDescription>
              Enviamos um código de 6 dígitos para {user?.email}. Digite o código abaixo para ativar o 2FA.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <Label htmlFor="verificationCode">Código de Verificação</Label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono h-14 mt-1.5"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-slate-500 text-center mt-2">
                O código expira em 10 minutos
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={handleCancelVerification}
                disabled={verify2FACodeMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-[#355340] hover:bg-[#355340]/90"
                disabled={verify2FACodeMutation.isPending || verificationCode.length !== 6}
              >
                {verify2FACodeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || send2FACodeMutation.isPending}
            >
              {send2FACodeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reenviando...
                </>
              ) : resendCooldown > 0 ? (
                `Reenviar código em ${resendCooldown}s`
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Reenviar código
                </>
              )}
            </Button>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Após 5 tentativas incorretas, você precisará solicitar um novo código
              </p>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Alteração de Senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e escolha uma nova senha
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                placeholder="Digite sua senha atual"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                placeholder="Digite a nova senha (mín. 8 caracteres)"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                placeholder="Digite a nova senha novamente"
                className="mt-1.5"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowPasswordDialog(false)}
                disabled={changePasswordMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-[#355340] hover:bg-[#355340]/90"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}