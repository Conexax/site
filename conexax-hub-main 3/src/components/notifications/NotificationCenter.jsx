import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Check, Trash2, X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle
};

const typeColors = {
  info: "text-blue-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500"
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 50),
    enabled: !!user,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data?.user_id === user.id) {
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        
        // Toast para notificação nova
        const TypeIcon = typeIcons[event.data.type] || Info;
        toast(event.data.title, {
          description: event.data.message,
          icon: <TypeIcon className="h-4 w-4" />,
          duration: 5000
        });
      } else if (event.type === "update" || event.type === "delete") {
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      }
    });

    return unsubscribe;
  }, [user, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifs.map(n => 
        base44.entities.Notification.update(n.id, { read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      toast.success("Todas as notificações marcadas como lidas");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-slate-900">Notificações</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => markAllAsReadMutation.mutate()}
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Bell className="h-12 w-12 mb-2" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const TypeIcon = typeIcons[notification.type] || Info;
                const iconColor = typeColors[notification.type] || "text-slate-500";

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-slate-50 transition-colors",
                      !notification.read && "bg-blue-50/50"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn("mt-0.5", iconColor)}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={cn(
                            "text-sm font-medium",
                            !notification.read && "text-slate-900"
                          )}>
                            {notification.title}
                          </h4>
                          <div className="flex gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500"
                              onClick={() => deleteMutation.mutate(notification.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(notification.created_date).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}