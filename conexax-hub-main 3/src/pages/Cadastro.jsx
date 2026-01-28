import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FORM_SCHEMA = {
  fields: [
    { name: "clientName", label: "Nome do Cliente", type: "text", required: true },
    { name: "companyName", label: "Nome da Empresa", type: "text", required: true },
    { name: "headquarters", label: "Qual sede?", type: "select", required: true, options: ["Matriz", "Franquia"] },
    { name: "partnershipGoal", label: "Objetivo da Parceria", type: "textarea", required: true },
    { name: "city", label: "Cidade", type: "text", required: true },
    { 
      name: "revenue", 
      label: "Faturamento", 
      type: "select", 
      required: true,
      options: [
        "Até 20 mil",
        "De 20 mil até 40 mil",
        "De 40 mil até 60 mil",
        "De 60 mil até 80 mil",
        "De 80 mil até 100 mil",
        "De 100 mil até 150 mil",
        "De 150 mil até 250 mil",
        "De 250 mil até 400 mil",
        "De 400 mil até 600 mil",
        "De 600 mil até 1 milhão",
        "Mais de 1 milhão"
      ]
    },
    { name: "plan", label: "Plano contratado", type: "select", required: true, options: ["BRONZE", "SILVER", "GOLD", "ALPHA X"] },
    { name: "project", label: "Projeto", type: "select", required: true, options: ["Mensalidade", "Trimestral", "Semestral", "Anual"] },
    { name: "valuePaid", label: "Valor pago (R$)", type: "text", required: true },
    { name: "phone", label: "Número de contato", type: "tel", required: true },
    { name: "refundGuarantee", label: "Garantia de reembolso", type: "select", required: true, options: ["Sim", "Não"] },
    { name: "contractLink", label: "Link do Contrato", type: "url", required: true },
    { name: "recordingLink", label: "Link da Gravação", type: "url", required: true },
    { name: "additionalDeliverables", label: "Entregas Adicionais", type: "textarea", required: true },
    { name: "meetingSummary", label: "Resumo da reunião / Bullet Points", type: "textarea", required: true },
    { name: "promises", label: "Promessas", type: "textarea", required: true },
    { name: "clientLikes", label: "O que o cliente gosta?", type: "textarea", required: true },
    { name: "clientDislikes", label: "O que o cliente NÃO gosta?", type: "textarea", required: true },
    { name: "instagramLink", label: "Link do Instagram", type: "url", required: true },
    { name: "menuLink", label: "Link do Cardápio Digital", type: "url", required: true },
    { name: "ifoodLink", label: "Link do iFood", type: "url", required: false }
  ]
};

export default function Cadastro() {
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const { data: linkData, isLoading, error } = useQuery({
    queryKey: ["defaultRegistrationLink"],
    queryFn: async () => {
      const links = await base44.entities.RegistrationLink.list();
      if (links.length === 0) {
        const pipelines = await base44.entities.Pipeline.list();
        const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
        
        return base44.entities.RegistrationLink.create({
          name: "Link de Cadastro Padrão",
          token: "cadastro-alpha",
          pipeline_id: defaultPipeline.id,
          is_active: true,
          submissions_count: 0
        });
      }
      return links[0];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const stages = await base44.entities.Stage.filter({ pipeline_id: linkData.pipeline_id });
      const firstStage = stages.sort((a, b) => a.order - b.order)[0];
      
      const lead = await base44.entities.Lead.create({
        pipeline_id: linkData.pipeline_id,
        stage_id: firstStage.id,
        link_id: linkData.id,
        client_name: data.clientName,
        company_name: data.companyName,
        city: data.city,
        plan: data.plan,
        project: data.project,
        value_paid: data.valuePaid,
        phone: data.phone,
        payload_json: data,
        utm_source: linkData.utm_source || "direct"
      });

      await base44.entities.RegistrationLink.update(linkData.id, {
        submissions_count: (linkData.submissions_count || 0) + 1
      });

      return lead;
    },
    onSuccess: () => {
      setSubmitted(true);
    }
  });

  const validateField = (name, value, field) => {
    if (field.required && !value) {
      return "Campo obrigatório";
    }
    if (field.type === "url" && value && !value.match(/^https?:\/\/.+/)) {
      return "URL inválida";
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    FORM_SCHEMA.fields.forEach(field => {
      const error = validateField(field.name, formData[field.name], field);
      if (error) newErrors[field.name] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    submitMutation.mutate(formData);
  };

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Cadastro Enviado!</h2>
            <p className="text-slate-600 text-center">Obrigado! Sua solicitação foi recebida com sucesso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Cadastro de Cliente (Passagem de Bastão)</CardTitle>
            <CardDescription>Formulário de transição do Comercial para o Operacional.</CardDescription>
            <p className="text-sm text-slate-600 mt-2">
              Este formulário dá início ao projeto do novo cliente, garantindo alinhamento com as iniciativas estratégicas da Alpha. 
              Forneça o máximo de detalhes possível para que o comitê de projetos possa alocar recursos com precisão e conduzir a entrega com maestria.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={formData.clientName || ""}
                    onChange={(e) => handleChange("clientName", e.target.value)}
                    placeholder="Nome do cliente"
                  />
                  {errors.clientName && <p className="text-xs text-red-600 mt-1">{errors.clientName}</p>}
                </div>
                <div>
                  <Label>Nome da Empresa *</Label>
                  <Input
                    value={formData.companyName || ""}
                    onChange={(e) => handleChange("companyName", e.target.value)}
                    placeholder="Nome da empresa"
                  />
                  {errors.companyName && <p className="text-xs text-red-600 mt-1">{errors.companyName}</p>}
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>Qual sede? *</Label>
                  <Select value={formData.headquarters || ""} onValueChange={(v) => handleChange("headquarters", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a sede" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Matriz">Matriz</SelectItem>
                      <SelectItem value="Franquia">Franquia</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.headquarters && <p className="text-xs text-red-600 mt-1">{errors.headquarters}</p>}
                </div>
                <div>
                  <Label>Objetivo da Parceria *</Label>
                  <Textarea
                    value={formData.partnershipGoal || ""}
                    onChange={(e) => handleChange("partnershipGoal", e.target.value)}
                    placeholder="Detalhe o objetivo da parceria"
                    className="min-h-[120px]"
                  />
                  {errors.partnershipGoal && <p className="text-xs text-red-600 mt-1">{errors.partnershipGoal}</p>}
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>Cidade *</Label>
                  <Input
                    value={formData.city || ""}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Digite a cidade"
                  />
                  {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                </div>
                <div>
                  <Label>Faturamento *</Label>
                  <Select value={formData.revenue || ""} onValueChange={(v) => handleChange("revenue", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o faturamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORM_SCHEMA.fields.find(f => f.name === "revenue").options.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.revenue && <p className="text-xs text-red-600 mt-1">{errors.revenue}</p>}
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-3">
                <div>
                  <Label>Plano contratado *</Label>
                  <Select value={formData.plan || ""} onValueChange={(v) => handleChange("plan", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {["BRONZE", "SILVER", "GOLD", "ALPHA X"].map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.plan && <p className="text-xs text-red-600 mt-1">{errors.plan}</p>}
                </div>
                <div>
                  <Label>Projeto *</Label>
                  <Select value={formData.project || ""} onValueChange={(v) => handleChange("project", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Mensalidade", "Trimestral", "Semestral", "Anual"].map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.project && <p className="text-xs text-red-600 mt-1">{errors.project}</p>}
                </div>
                <div>
                  <Label>Valor pago (R$) *</Label>
                  <Input
                    value={formData.valuePaid || ""}
                    onChange={(e) => handleChange("valuePaid", e.target.value)}
                    placeholder="0,00"
                  />
                  {errors.valuePaid && <p className="text-xs text-red-600 mt-1">{errors.valuePaid}</p>}
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>Número de contato *</Label>
                  <Input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+55 (00) 00000-0000"
                  />
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label>Garantia de reembolso *</Label>
                  <Select value={formData.refundGuarantee || ""} onValueChange={(v) => handleChange("refundGuarantee", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.refundGuarantee && <p className="text-xs text-red-600 mt-1">{errors.refundGuarantee}</p>}
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>Link do Contrato *</Label>
                  <Input
                    type="url"
                    value={formData.contractLink || ""}
                    onChange={(e) => handleChange("contractLink", e.target.value)}
                    placeholder="https://"
                  />
                  {errors.contractLink && <p className="text-xs text-red-600 mt-1">{errors.contractLink}</p>}
                </div>
                <div>
                  <Label>Link da Gravação *</Label>
                  <Input
                    type="url"
                    value={formData.recordingLink || ""}
                    onChange={(e) => handleChange("recordingLink", e.target.value)}
                    placeholder="https://"
                  />
                  {errors.recordingLink && <p className="text-xs text-red-600 mt-1">{errors.recordingLink}</p>}
                </div>
              </section>

              <div>
                <Label>Entregas Adicionais *</Label>
                <Textarea
                  value={formData.additionalDeliverables || ""}
                  onChange={(e) => handleChange("additionalDeliverables", e.target.value)}
                  className="min-h-[100px]"
                />
                {errors.additionalDeliverables && <p className="text-xs text-red-600 mt-1">{errors.additionalDeliverables}</p>}
              </div>

              <div>
                <Label>Resumo da reunião / Bullet Points *</Label>
                <Textarea
                  value={formData.meetingSummary || ""}
                  onChange={(e) => handleChange("meetingSummary", e.target.value)}
                  className="min-h-[100px]"
                />
                {errors.meetingSummary && <p className="text-xs text-red-600 mt-1">{errors.meetingSummary}</p>}
              </div>

              <div>
                <Label>Promessas *</Label>
                <Textarea
                  value={formData.promises || ""}
                  onChange={(e) => handleChange("promises", e.target.value)}
                  className="min-h-[100px]"
                />
                {errors.promises && <p className="text-xs text-red-600 mt-1">{errors.promises}</p>}
              </div>

              <section className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>O que o cliente gosta? *</Label>
                  <Textarea
                    value={formData.clientLikes || ""}
                    onChange={(e) => handleChange("clientLikes", e.target.value)}
                    className="min-h-[100px]"
                  />
                  {errors.clientLikes && <p className="text-xs text-red-600 mt-1">{errors.clientLikes}</p>}
                </div>
                <div>
                  <Label>O que o cliente NÃO gosta? *</Label>
                  <Textarea
                    value={formData.clientDislikes || ""}
                    onChange={(e) => handleChange("clientDislikes", e.target.value)}
                    className="min-h-[100px]"
                  />
                  {errors.clientDislikes && <p className="text-xs text-red-600 mt-1">{errors.clientDislikes}</p>}
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>Link do Instagram *</Label>
                  <Input
                    type="url"
                    value={formData.instagramLink || ""}
                    onChange={(e) => handleChange("instagramLink", e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                  {errors.instagramLink && <p className="text-xs text-red-600 mt-1">{errors.instagramLink}</p>}
                </div>
                <div>
                  <Label>Link do Cardápio Digital *</Label>
                  <Input
                    type="url"
                    value={formData.menuLink || ""}
                    onChange={(e) => handleChange("menuLink", e.target.value)}
                    placeholder="https://"
                  />
                  {errors.menuLink && <p className="text-xs text-red-600 mt-1">{errors.menuLink}</p>}
                </div>
              </section>

              <div>
                <Label>Link do iFood (opcional)</Label>
                <Input
                  type="url"
                  value={formData.ifoodLink || ""}
                  onChange={(e) => handleChange("ifoodLink", e.target.value)}
                  placeholder="https://"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={submitMutation.isPending}
                  className="bg-violet-600 hover:bg-violet-700 px-8"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}