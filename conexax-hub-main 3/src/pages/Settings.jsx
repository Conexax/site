import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield } from "lucide-react";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import SettingsOverview from "@/components/settings/SettingsOverview";
import PlansSettings from "@/components/settings/PlansSettings";
import DataSettings from "@/components/settings/DataSettings";
import IntegrationsSettings from "@/components/settings/IntegrationsSettings";
import DomainsSettings from "@/components/settings/DomainsSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import CodeSettings from "@/components/settings/CodeSettings";
import AgentsSettings from "@/components/settings/AgentsSettings";
import AutomationsSettings from "@/components/settings/AutomationsSettings";
import AnalyticsSettings from "@/components/settings/AnalyticsSettings";
import NotificationsSettings from "@/components/settings/NotificationsSettings";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-500">Apenas administradores podem acessar as configurações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SettingsSidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      
      <div className="flex-1 overflow-auto min-w-0">
        {activeSection === "overview" && <SettingsOverview />}
        {activeSection === "plans" && <PlansSettings />}
        {activeSection === "data" && <DataSettings />}
        {activeSection === "domains" && <DomainsSettings />}
        {activeSection === "integrations" && <IntegrationsSettings />}
        {activeSection === "security" && <SecuritySettings />}
        {activeSection === "code" && <CodeSettings />}
        {activeSection === "agents" && <AgentsSettings />}
        {activeSection === "automations" && <AutomationsSettings />}
        {activeSection === "analytics" && <AnalyticsSettings />}
        {activeSection === "notifications" && <NotificationsSettings />}
      </div>
    </div>
  );
}