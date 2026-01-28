import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Globe, Plus, Trash2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DomainsSettings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const queryClient = useQueryClient();

  const currentDomain = window.location.hostname;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Domínios</h1>
        <p className="text-slate-500 mt-1">Configure domínios personalizados para sua aplicação</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Domínio Atual</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">{currentDomain}</p>
              <p className="text-sm text-slate-500">Domínio padrão Base44</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Globe className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Domínios Personalizados</h3>
            <p className="text-slate-500 mb-6">
              Configure seu próprio domínio para a aplicação.<br />
              Contate o suporte para adicionar domínios personalizados.
            </p>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Contatar Suporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}