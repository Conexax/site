import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OTEDashboard from "@/components/ote/OTEDashboard";
import OTEConfiguration from "@/components/ote/OTEConfiguration";
import { AuditPageView } from "@/components/audit/AuditLogger";
import { Calculator, Settings } from "lucide-react";

export default function OTE() {
  return (
    <>
      <AuditPageView pageName="OTE" />
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">OTE - On-Target Earnings</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão completa de ganhos esperados e realizados</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="configuration" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuração
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <OTEDashboard />
          </TabsContent>

          <TabsContent value="configuration">
            <OTEConfiguration />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}