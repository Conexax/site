import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import Require2FA from "@/components/Require2FA";
import {
  LayoutDashboard,
  GitBranch,
  Zap,
  Mail,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/notifications/NotificationCenter";

const menuGroups = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { name: "Visão Geral", icon: Home, page: "Dashboard" },
      { name: "Atividades", icon: Zap, page: "Activities" },
    ]
  },
  {
    id: "pipeline",
    name: "Pipeline",
    icon: GitBranch,
    items: [
      { name: "Pipeline", icon: GitBranch, page: "Pipeline" },
      { name: "Leads", icon: Mail, page: "Leads" },
    ]
  }
];

export default function OnboardingLayout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(["dashboard"]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [groupId]
    );
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (currentPageName === "Cadastro" || currentPageName === "Verify2FA") {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <Require2FA>
      <div className="min-h-screen bg-slate-50 flex">
        {mobileOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-[#62997f] flex flex-col transition-all duration-300",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#62997f]/20">
            {!collapsed && (
              <div className="text-sm font-bold text-[#355340]">Onboarding</div>
            )}
            {collapsed && (
              <div className="text-xs font-bold text-[#355340]">OB</div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-8 w-8"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {menuGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.id);
              const hasActivePage = group.items.some(item => item.page === currentPageName);
              const GroupIcon = group.icon;
              
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      hasActivePage
                        ? "bg-[#355340] text-white"
                        : "text-[#355340] hover:bg-[#62997f]/10"
                    )}
                  >
                    <GroupIcon className={cn("h-5 w-5 flex-shrink-0")} />
                    {!collapsed && (
                      <>
                        <span className="font-medium text-sm flex-1 text-left">{group.name}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </>
                    )}
                  </button>

                  {isExpanded && !collapsed && (
                    <div className="ml-4 space-y-1 border-l-2 border-[#62997f]/30 pl-3">
                      {group.items.map((item) => {
                        const isActive = currentPageName === item.page;
                        const ItemIcon = item.icon;
                        return (
                          <Link
                            key={item.page}
                            to={createPageUrl(item.page)}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                              isActive
                                ? "bg-[#355340] text-white font-medium"
                                : "text-[#355340]/70 hover:bg-[#62997f]/10"
                            )}
                          >
                            <ItemIcon className="h-4 w-4 flex-shrink-0" />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-[#62997f]/20">
            <div className={cn(
              "flex items-center gap-3 p-2 rounded-lg",
              collapsed && "justify-center"
            )}>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-[#355340] text-white text-sm font-medium">
                  {user?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#355340] truncate">
                    {user?.full_name || "Usuário"}
                  </p>
                  <p className="text-xs text-[#355340]/60 truncate">
                    {user?.role === "admin" ? "Administrador" : user?.role === "sdr" ? "SDR" : user?.role}
                  </p>
                </div>
              )}
              {!collapsed && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-[#355340]/70"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="hidden lg:flex items-center justify-end p-4 bg-white border-b border-slate-200">
            <NotificationCenter />
          </div>

          <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-bold text-[#355340] flex-1">Onboarding</span>
            <NotificationCenter />
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </Require2FA>
  );
}