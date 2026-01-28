import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function NotificationsSettings() {
  const [user, setUser] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["pushSubscriptions", user?.id],
    queryFn: () => base44.entities.PushSubscription.filter({ userId: user.id }),
    enabled: !!user,
  });

  const activeSubscription = subscriptions.find(s => s.isActive);

  useEffect(() => {
    if (activeSubscription) {
      setEnabled(activeSubscription.notificationsEnabled);
    }
  }, [activeSubscription]);

  const toggleMutation = useMutation({
    mutationFn: async (newValue) => {
      if (activeSubscription) {
        return base44.entities.PushSubscription.update(activeSubscription.id, {
          notificationsEnabled: newValue
        });
      } else {
        // Criar uma nova subscription (em produção seria feito no app mobile)
        return base44.entities.PushSubscription.create({
          userId: user.id,
          deviceToken: `web-${Date.now()}`,
          platform: "web",
          isActive: true,
          notificationsEnabled: newValue
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pushSubscriptions"] });
      toast.success("Preferências atualizadas");
    },
  });

  const handleToggle = (checked) => {
    setEnabled(checked);
    toggleMutation.mutate(checked);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-violet-600" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Gerencie suas notificações no celular
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Receber notificações no celular</Label>
              <p className="text-sm text-slate-500">
                Você pode desativar a qualquer momento
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={toggleMutation.isPending}
            />
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <p className="font-medium mb-2">Você receberá notificações para:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Venda aprovada</li>
                <li>Pagamento confirmado</li>
                <li>Reembolso realizado</li>
                <li>Cobrança criada</li>
                <li>Cobrança vencida</li>
                <li>Cobrança paga</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}