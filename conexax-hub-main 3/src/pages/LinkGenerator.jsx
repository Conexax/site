import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link2, Copy, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function LinkGenerator() {
  const queryClient = useQueryClient();

  const { data: link, isLoading } = useQuery({
    queryKey: ["defaultRegistrationLink"],
    queryFn: async () => {
      const links = await base44.entities.RegistrationLink.list();
      if (links.length > 0) return links[0];
      
      const pipelines = await base44.entities.Pipeline.list();
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      
      const token = "cadastro-alpha";
      return base44.entities.RegistrationLink.create({
        name: "Link de Cadastro Padrão",
        token,
        pipeline_id: defaultPipeline.id,
        is_active: true,
        submissions_count: 0
      });
    },
  });

  const copyLink = () => {
    const url = `${window.location.origin}/cadastro`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const openLink = () => {
    window.open("/cadastro", "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const url = `${window.location.origin}/cadastro`;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Link de Cadastro</h1>
        <p className="text-slate-500 text-sm mt-1">Link único para captura de leads</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Link de Cadastro Alpha</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <span>{link?.submissions_count || 0} cadastros realizados</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-sm text-slate-600 break-all">
                {url}
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button onClick={copyLink} className="bg-violet-600 hover:bg-violet-700">
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
              <Button variant="outline" onClick={openLink}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Formulário
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este é o link único de cadastro. Todos os leads enviados através deste formulário aparecerão automaticamente no Kanban.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}