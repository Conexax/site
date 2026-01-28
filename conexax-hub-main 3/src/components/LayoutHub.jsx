import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import Require2FA from "@/components/Require2FA";
import {
  GitBranch,
  Mail,
  Building2,
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

const crmMenuGroups = [
  {
    id: "crm",
    name: "CRM",
    icon: GitBranch,
    items: [
      { name: "Pipeline", icon: GitBranch, page: "Pipeline" },
      { name: "Leads", icon: Mail, page: "Leads" },
      { name: "Contas", icon: Building2, page: "Clients" },
    ]
  }
];

export default function LayoutHub({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const saved = sessionStorage.getItem("expandedMenuGroupsHub");
    return saved ? JSON.parse(saved) : ["crm"];
  });

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

  useEffect(() => {
    sessionStorage.setItem("expandedMenuGroupsHub", JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [groupId];
      }
    });
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <Require2FA>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Mobile Overlay */}
        {mobileOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-[#62997f] flex flex-col transition-all duration-300",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#62997f]/20">
            {!collapsed && (
              <img 
                src="https://conexax.com.br/wp-content/uploads/2026/01/logo-conexax-e1768866918849.webp" 
                alt="ConexaX HUB" 
                className="h-8 object-contain"
              />
            )}
            {collapsed && (
              <img 
                src="https://conexax.com.br/wp-content/uploads/2026/01/logo-conexax-e1768866918849.webp" 
                alt="ConexaX HUB" 
                className="h-8 w-8 object-contain"
              />
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

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-[#62997f] [&::-webkit-scrollbar-track]:bg-slate-100">
            {crmMenuGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.id);
              const hasActivePage = group.items.some(item => item.page === currentPageName);
              const GroupIcon = group.icon;
              
              return (
                <div key={group.id} className="space-y-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      hasActivePage
                        ? "bg-[#355340] text-white"
                        : "text-[#355340] hover:bg-[#62997f]/10"
                    )}
                    aria-expanded={isExpanded}
                    aria-controls={`menu-group-${group.id}`}
                  >
                    <GroupIcon className={cn("h-5 w-5 flex-shrink-0", hasActivePage ? "text-white" : "text-[#355340]")} />
                    {!collapsed && (
                      <>
                        <span className="font-medium text-sm flex-1 text-left">{group.name}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isExpanded && "rotate-180",
                            hasActivePage ? "text-white" : "text-[#355340]"
                          )}
                        />
                      </>
                    )}
                  </button>

                  {/* Group Items */}
                  {isExpanded && !collapsed && (
                    <div 
                      id={`menu-group-${group.id}`}
                      className="ml-4 space-y-1 border-l-2 border-[#62997f]/30 pl-3"
                    >
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
                                : "text-[#355340]/70 hover:bg-[#62997f]/10 hover:text-[#355340]"
                            )}
                          >
                            <ItemIcon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-[#355340]")} />
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

          {/* User Section */}
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
                    CRM Hub
                  </p>
                </div>
              )}
              {!collapsed && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-[#355340]/70 hover:text-[#355340] hover:bg-[#62997f]/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Notification */}
          <div className="hidden lg:flex items-center justify-end p-4 bg-white border-b border-slate-200">
            <NotificationCenter />
          </div>

          {/* Mobile Header */}
          <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <img 
              src="https://conexax.com.br/wp-content/uploads/2026/01/logo-conexax-e1768866918849.webp" 
              alt="ConexaX" 
              className="h-7 object-contain flex-1"
            />
            <NotificationCenter />
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </Require2FA>
  );
}