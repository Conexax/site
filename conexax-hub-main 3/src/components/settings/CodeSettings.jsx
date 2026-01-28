import React, { useState } from "react";
import { Code, Copy, CheckCircle2, FileCode, Database, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function CodeSettings() {
  const [copiedApi, setCopiedApi] = useState(false);
  const [copiedSdk, setCopiedSdk] = useState(false);

  const apiExample = `import { base44 } from "@/api/base44Client";

// Buscar dados
const clients = await base44.entities.Client.list();

// Criar registro
const newClient = await base44.entities.Client.create({
  company_name: "Empresa Exemplo",
  email: "contato@exemplo.com"
});

// Atualizar registro
await base44.entities.Client.update(clientId, {
  status: "active"
});`;

  const webhookExample = `export default async function myFunction(request, context) {
  const { base44 } = context;
  
  // Sua lógica aqui
  const data = await base44.asServiceRole.entities.Lead.list();
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, data })
  };
}`;

  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Código</h1>
        <p className="text-slate-500 mt-1">Exemplos e documentação para desenvolvimento</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Code className="h-5 w-5 text-[#355340]" />
            Exemplos de Código
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="api" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="api">SDK Base44</TabsTrigger>
              <TabsTrigger value="webhook">Backend Functions</TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="space-y-4">
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm">
                  <code>{apiExample}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(apiExample, setCopiedApi)}
                >
                  {copiedApi ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="webhook" className="space-y-4">
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm">
                  <code>{webhookExample}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(webhookExample, setCopiedSdk)}
                >
                  {copiedSdk ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border-slate-200 border rounded-lg p-6 text-center bg-slate-50/50">
          <div className="w-12 h-12 bg-[#62997f]/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Database className="h-6 w-6 text-[#355340]" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Entidades</h3>
          <p className="text-xs text-slate-500">Gerencie dados com facilidade</p>
        </div>

        <div className="border-slate-200 border rounded-lg p-6 text-center bg-slate-50/50">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <FileCode className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Backend Functions</h3>
          <p className="text-xs text-slate-500">Lógica personalizada no servidor</p>
        </div>

        <div className="border-slate-200 border rounded-lg p-6 text-center bg-slate-50/50">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Terminal className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Integrações</h3>
          <p className="text-xs text-slate-500">Conecte com serviços externos</p>
        </div>
      </div>
    </div>
  );
}