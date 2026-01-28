import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Mail, Webhook, Bot, FileImage, Globe, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function IntegrationsSettings() {
  const integrations = [
    {
      name: "Core Integrations",
      icon: Zap,
      description: "Integrações nativas do Base44",
      status: "active",
      items: ["InvokeLLM", "SendEmail", "UploadFile", "GenerateImage"]
    },
    {
      name: "Email",
      icon: Mail,
      description: "Envio de emails transacionais",
      status: "active",
      items: ["SendEmail via Base44"]
    },
    {
      name: "Webhooks",
      icon: Webhook,
      description: "Integração com formulários externos",
      status: "active",
      items: ["Webhook Leads API"]
    },
    {
      name: "IA e Automação",
      icon: Bot,
      description: "Ferramentas de inteligência artificial",
      status: "active",
      items: ["InvokeLLM", "GenerateImage", "ExtractData"]
    },
    {
      name: "Armazenamento",
      icon: FileImage,
      description: "Upload e gestão de arquivos",
      status: "active",
      items: ["UploadFile", "UploadPrivateFile"]
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Integrações</h1>
        <p className="text-slate-500">Serviços externos conectados à plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <integration.icon className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">{integration.description}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Recursos disponíveis:</p>
                {integration.items.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                    <span className="text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-5 w-5" />
            URLs e Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Webhook URL Base</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-slate-100 p-2 rounded font-mono">
                {window.location.origin}/api/webhook/[token]
              </code>
              <Button variant="outline" size="sm">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}