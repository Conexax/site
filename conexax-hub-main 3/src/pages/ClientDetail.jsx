import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatDate = (date) => {
  if (!date) return "";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};

const formatDateTime = (date) => {
  if (!date) return "";
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  TrendingUp,
  Zap,
  Settings,
  Pencil,
  Save,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import CommentSection from "@/components/collaboration/CommentSection";
import FileAttachments from "@/components/collaboration/FileAttachments";
import ChurnIndicator from "@/components/clients/ChurnIndicator";
import GenerateContractWizard from "@/components/contracts/GenerateContractWizard";
import SquadAssignment from "@/components/clients/SquadAssignment";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import ClientHealthDashboard from "@/components/onboarding/ClientHealthDashboard";
import { AuditPageView } from "@/components/audit/AuditLogger";

export default function ClientDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get("id");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }),
    enabled: !!clientId,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["clientContracts", clientId],
    queryFn: () => base44.entities.Contract.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["clientMetrics", clientId],
    queryFn: () => base44.entities.Metric.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["clientActivities", clientId],
    queryFn: () => base44.entities.Activity.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["clientIntegrations", clientId],
    queryFn: () => base44.entities.Integration.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      setEditing(false);
    },
  });

  const clientData = client?.[0];

  const handleEdit = () => {
    setFormData({
      company_name: clientData?.company_name || "",
      cnpj: clientData?.cnpj || "",
      responsible_name: clientData?.responsible_name || "",
      email: clientData?.email || "",
      phone: clientData?.phone || "",
      segment: clientData?.segment || "",
      plan: clientData?.plan || "starter",
      plan_duration: clientData?.plan_duration || "anual",
      status: clientData?.status || "onboarding",
      notes: clientData?.notes || ""
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const planLabels = {
    starter: "Starter",
    growth: "Growth",
    scale: "Scale",
    enterprise: "Enterprise"
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={Building2}
          title="Cliente não encontrado"
          description="O cliente solicitado não existe"
          actionLabel="Voltar para Clientes"
          onAction={() => window.location.href = createPageUrl("Clients")}
        />
      </div>
    );
  }

  return (
    <>
    <AuditPageView pageName="ClientDetail" />
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Clients")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#62997f]/20 rounded-xl flex items-center justify-center">
              <span className="text-[#355340] font-bold text-lg">
                {clientData.company_name?.charAt(0) || "C"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{clientData.company_name}</h1>
              <p className="text-slate-500 text-sm">{clientData.segment || "Sem segmento definido"}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={clientData.status} />
          <ChurnIndicator client={clientData} showDetails={true} />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setGenerateDialogOpen(true)}
            className="bg-[#355340] hover:bg-[#355340]/90"
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar Contrato
          </Button>
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="health">Health Score</TabsTrigger>
          <TabsTrigger value="squad">Squad</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          {editing ? (
            <Card>
              <CardHeader>
                <CardTitle>Editar Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Empresa</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Input
                      value={formData.responsible_name}
                      onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Segmento</Label>
                    <Input
                      value={formData.segment}
                      onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Plano</Label>
                    <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="scale">Scale</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tempo do Plano</Label>
                    <Select value={formData.plan_duration} onValueChange={(v) => setFormData({ ...formData, plan_duration: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} className="bg-[#355340] hover:bg-[#355340]/90">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dados Cadastrais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">CNPJ</p>
                      <p className="font-medium">{clientData.cnpj || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">E-mail</p>
                      <p className="font-medium">{clientData.email || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Telefone</p>
                      <p className="font-medium">{clientData.phone || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Data de Início</p>
                      <p className="font-medium">
                        {clientData.start_date ? formatDate(clientData.start_date) : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações do Contrato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500">Plano Contratado</p>
                    <p className="font-medium">{planLabels[clientData.plan] || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tempo do Plano</p>
                    <p className="font-medium">
                      {clientData.plan_duration === "trimestral" ? "Trimestral" : 
                       clientData.plan_duration === "semestral" ? "Semestral" : 
                       clientData.plan_duration === "anual" ? "Anual" : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Faturamento Médio</p>
                    <p className="font-medium">
                      {clientData.average_revenue ? `R$ ${clientData.average_revenue.toLocaleString("pt-BR")}` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Responsável</p>
                    <p className="font-medium">{clientData.responsible_name || "-"}</p>
                  </div>
                </CardContent>
              </Card>

              {clientData.notes && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">{clientData.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="onboarding">
          <OnboardingProgress clientId={clientId} />
        </TabsContent>

        <TabsContent value="health">
          <ClientHealthDashboard clientId={clientId} />
        </TabsContent>

        <TabsContent value="squad">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atribuição de Squad</CardTitle>
            </CardHeader>
            <CardContent>
              <SquadAssignment 
                client={clientData} 
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["client", clientId] });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Contratos</CardTitle>
              <Link to={createPageUrl(`Contracts?client_id=${clientId}`)}>
                <Button size="sm" className="bg-[#355340] hover:bg-[#355340]/90">
                  Novo Contrato
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Nenhum contrato"
                  description="Este cliente ainda não possui contratos"
                />
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div key={contract.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Contrato #{contract.contract_number || contract.id.slice(0, 8)}</p>
                          <p className="text-sm text-slate-500">
                            R$ {contract.monthly_value?.toLocaleString("pt-BR")} /mês
                          </p>
                        </div>
                        <StatusBadge status={contract.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Métricas</CardTitle>
              <Link to={createPageUrl(`Metrics?client_id=${clientId}`)}>
                <Button size="sm" className="bg-[#355340] hover:bg-[#355340]/90">
                  Adicionar Métricas
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Nenhuma métrica"
                  description="Este cliente ainda não possui métricas registradas"
                />
              ) : (
                <div className="space-y-3">
                  {metrics.slice(0, 6).map((metric) => (
                    <div key={metric.id} className="p-4 border rounded-lg">
                      <p className="font-medium">{metric.period}</p>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-slate-500">Receita</p>
                          <p className="font-medium">R$ {metric.monthly_revenue?.toLocaleString("pt-BR") || "-"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">ROI</p>
                          <p className="font-medium">{metric.roi ? `${metric.roi}x` : "-"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Pedidos</p>
                          <p className="font-medium">{metric.orders_count || "-"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Atividades</CardTitle>
              <Link to={createPageUrl("Activities")}>
                <Button size="sm" className="bg-[#355340] hover:bg-[#355340]/90">
                  Nova Atividade
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="Nenhuma atividade"
                  description="Este cliente ainda não possui atividades"
                />
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-slate-500">
                            {activity.due_date && formatDate(activity.due_date)}
                          </p>
                        </div>
                        <StatusBadge status={activity.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Integrações</CardTitle>
              </CardHeader>
              <CardContent>
                {integrations.length === 0 ? (
                  <EmptyState
                    icon={Settings}
                    title="Nenhuma integração"
                    description="As integrações estarão disponíveis em breve"
                  />
                ) : (
                  <div className="space-y-3">
                    {integrations.map((integration) => (
                      <div key={integration.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{integration.name}</p>
                          <StatusBadge status={integration.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <FileAttachments entityType="client" entityId={clientId} />
            <CommentSection entityType="client" entityId={clientId} />
          </div>
        </TabsContent>
      </Tabs>

      <GenerateContractWizard
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        client={clientData}
      />
    </div>
    </>
  );
}