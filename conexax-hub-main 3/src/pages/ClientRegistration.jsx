import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Building2,
  Save,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { AuditPageView } from "@/components/audit/AuditLogger";
import { toast } from "sonner";

export default function ClientRegistration() {
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    cnpj: "",
    responsible_name: "",
    email: "",
    phone: "",
    segment: "",
    average_revenue: "",
    plan: "growth",
    plan_duration: "anual",
    start_date: new Date().toISOString().split("T")[0],
    status: "onboarding",
    internal_responsible_id: "",
    commercial_team_id: "",
    notes: ""
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: commercialTeam = [] } = useQuery({
    queryKey: ["commercialTeam"],
    queryFn: () => base44.entities.CommercialTeamMember.list(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const clientData = {
        ...data,
        average_revenue: data.average_revenue ? parseFloat(data.average_revenue) : null
      };
      const client = await base44.entities.Client.create(clientData);
      return client;
    },
    onSuccess: () => {
      setSuccess(true);
      toast.success("Cliente cadastrado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar cliente: ${error.message}`);
    }
  });

  const handleSubmit = () => {
    createMutation.mutate(formData);
  };

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  if (success) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[80vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Cliente cadastrado!</h2>
            <p className="text-slate-500 mb-6">
              O cliente foi cadastrado com sucesso e já está disponível no sistema.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to={createPageUrl("Clients")}>
                <Button variant="outline">Ver Clientes</Button>
              </Link>
              <Button 
                className="bg-[#355340] hover:bg-[#355340]/90"
                onClick={() => {
                  setSuccess(false);
                  setStep(1);
                  setFormData({
                    company_name: "",
                    cnpj: "",
                    responsible_name: "",
                    email: "",
                    phone: "",
                    segment: "",
                    average_revenue: "",
                    plan: "growth",
                    plan_duration: "anual",
                    start_date: new Date().toISOString().split("T")[0],
                    status: "onboarding",
                    internal_responsible_id: "",
                    commercial_team_id: "",
                    notes: ""
                  });
                }}
              >
                Cadastrar Outro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AuditPageView pageName="ClientRegistration" />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Clients")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Novo Cliente</h1>
          <p className="text-slate-500 text-sm mt-1">Cadastre um novo cliente no sistema</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-[#355340]" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>Informações básicas do cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome da Empresa *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => updateField("cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label>Segmento do E-commerce</Label>
                <Input
                  value={formData.segment}
                  onChange={(e) => updateField("segment", e.target.value)}
                  placeholder="Ex: Moda, Eletrônicos, etc."
                />
              </div>
              <div>
                <Label>Responsável</Label>
                <Input
                  value={formData.responsible_name}
                  onChange={(e) => updateField("responsible_name", e.target.value)}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>Faturamento Médio Mensal</Label>
                <Input
                  type="number"
                  value={formData.average_revenue}
                  onChange={(e) => updateField("average_revenue", e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!formData.company_name || !formData.email}>
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Contract Info */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Dados do Contrato</CardTitle>
            <CardDescription>Informações sobre o plano contratado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Plano Contratado</Label>
                <Select value={formData.plan} onValueChange={(v) => updateField("plan", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => p.is_active).map((plan) => (
                      <SelectItem key={plan.id} value={plan.name.toLowerCase()}>
                        {plan.name} - R$ {plan.monthly_value?.toLocaleString("pt-BR")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tempo do Plano</Label>
                <Select value={formData.plan_duration} onValueChange={(v) => updateField("plan_duration", v)}>
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
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => updateField("start_date", e.target.value)}
                />
              </div>
              <div>
                <Label>Status Inicial</Label>
                <Select value={formData.status} onValueChange={(v) => updateField("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button onClick={() => setStep(3)}>
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Team & Notes */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipe e Observações</CardTitle>
            <CardDescription>Vincule o cliente às equipes responsáveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Responsável Interno</Label>
                <Select 
                  value={formData.internal_responsible_id} 
                  onValueChange={(v) => updateField("internal_responsible_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendedor Responsável</Label>
                <Select 
                  value={formData.commercial_team_id} 
                  onValueChange={(v) => updateField("commercial_team_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {commercialTeam.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Informações adicionais sobre o cliente..."
                rows={4}
              />
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="bg-[#355340] hover:bg-[#355340]/90"
                disabled={createMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Salvando..." : "Cadastrar Cliente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}