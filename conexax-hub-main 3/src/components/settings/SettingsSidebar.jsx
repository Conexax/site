import React from "react";
import { Link } from "react-router-dom";
import { 
  Eye, 
  Package, 
  Database,
  Globe,
  Zap,
  Shield,
  Code,
  FileText,
  BarChart,
  X,
  Menu,
  ArrowLeft,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "../../utils";

const sections = [
  { id: "overview", name: "Visão geral", icon: Eye },
  { id: "plans", name: "Planos", icon: Package },
  { id: "data", name: "Dados", icon: Database },
  { id: "domains", name: "Domínios", icon: Globe },
  { id: "integrations", name: "Integrações", icon: Zap },
  { id: "security", name: "Segurança", icon: Shield },
  { id: "notifications", name: "Notificações", icon: Bell },
  { id: "code", name: "Código", icon: Code },
  { id: "automations", name: "Automações", icon: FileText },
  { id: "analytics", name: "Análises", icon: BarChart },
];

export default function SettingsSidebar({ activeSection, onSectionChange, mobileMenuOpen, setMobileMenuOpen }) {
  const currentSection = sections.find(s => s.id === activeSection);
  const CurrentIcon = currentSection?.icon || Eye;

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CurrentIcon className="h-5 w-5 text-[#355340]" />
              <h2 className="font-semibold text-slate-900">{currentSection?.name}</h2>
            </div>
          </div>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" size="sm" className="text-[#355340]">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-4 overflow-y-auto transition-transform duration-300",
        "lg:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900 px-3">Painel</h2>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive 
                    ? "bg-slate-100 text-slate-900 font-medium" 
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="h-4 w-4" />
                {section.name}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Spacer */}
      <div className="lg:hidden h-14" />
    </>
  );
}