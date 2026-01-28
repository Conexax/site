import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AsaasConnection from "../components/asaas/AsaasConnection";
import AsaasWebhooks from "../components/asaas/AsaasWebhooks";
import AsaasEvents from "../components/asaas/AsaasEvents";
import AsaasStatus from "../components/asaas/AsaasStatus";
import AsaasMetrics from "../components/asaas/AsaasMetrics";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function AsaasIntegration() {
  const [activeTab, setActiveTab] = useState("connection");

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl("Settings")}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Integração Asaas</h1>
          <p className="text-slate-600 mt-1">
            Configure e gerencie a integração com o Asaas
          </p>
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
                <TabsTrigger value="connection">Conexão</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                <TabsTrigger value="events">Eventos</TabsTrigger>
                <TabsTrigger value="metrics">Métricas</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
              </TabsList>

              <TabsContent value="connection">
                <AsaasConnection />
              </TabsContent>

              <TabsContent value="webhooks">
                <AsaasWebhooks />
              </TabsContent>

              <TabsContent value="events">
                <AsaasEvents />
              </TabsContent>

              <TabsContent value="metrics">
                <AsaasMetrics />
              </TabsContent>

              <TabsContent value="status">
                <AsaasStatus />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}