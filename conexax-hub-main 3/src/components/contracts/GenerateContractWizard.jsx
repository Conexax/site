import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader } from "lucide-react";
import { toast } from "sonner";

export default function GenerateContractWizard({ open, onOpenChange, client, lead }) {
  const [step, setStep] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [formData, setFormData] = useState({
    company_name: client?.company_name || "",
    cnpj: client?.cnpj || "",
    responsible_name: client?.responsible_name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    address: client?.notes || "",
    start_date: new Date().toISOString().split('T')[0],
    discount_percentage: "0",
    setup_fee: "0"
  });
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list(),
  });

  const { data: selectedPlan } = useQuery({
    queryKey: ["plan", selectedPlanId],
    queryFn: () => base44.entities.Plan.filter({ id: selectedPlanId }),
    enabled: !!selectedPlanId,
  });

  const { data: existingContracts } = useQuery({
    queryKey: ["contracts", client?.id],
    queryFn: () => base44.entities.Contract.filter({ client_id: client?.id }),
    enabled: !!client?.id,
  });

  const generatePreviewMutation = useMutation({
    mutationFn: async () => {
      setLoadingPreview(true);
      const response = await base44.functions.invoke('generateContractPreview', {
        plan_id: selectedPlanId,
        client_data: formData
      });
      return response.data;
    },
    onSuccess: (data) => {
      setPreview(data);
      setStep(3);
      setLoadingPreview(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar preview: ${error.message}`);
      setLoadingPreview(false);
    }
  });

  const generatePDFMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateContractPDF', {
        plan_id: selectedPlanId,
        client_id: client?.id,
        client_data: formData,
        preview_data: preview
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato gerado com sucesso!");
      onOpenChange(false);
      setStep(1);
      setSelectedPlanId("");
    },
    onError: (error) => {
      toast.error(`Erro ao gerar contrato: ${error.message}`);
    }
  });

  const handleNext = () => {
    if (step === 1) {
      if (!selectedPlanId) {
        toast.error("Selecione um plano");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const errors = validateForm();
      if (errors.length > 0) {
        toast.error(errors[0]);
        return;
      }
      generatePreviewMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.company_name?.trim()) errors.push("Razão social obrigatória");
    if (!formData.cnpj?.trim()) errors.push("CNPJ obrigatório");
    if (!formData.responsible_name?.trim()) errors.push("Responsável obrigatório");
    if (!formData.email?.trim()) errors.push("E-mail obrigatório");
    if (!formData.phone?.trim()) errors.push("Telefone obrigatório");
    if (!formData.start_date) errors.push("Data de início obrigatória");
    return errors;
  };

  const activeContractForPlan = existingContracts?.find(
    c => c.plan_id === selectedPlanId && c.status !== 'cancelled'
  );

  const planData = selectedPlan?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    s < step ? 'bg-emerald-600 text-white' :
                    s === step ? 'bg-[#355340] text-white' :
                    'bg-slate-200 text-slate-600'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
              ))}
            </div>
            Gerar Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-96">
          {/* Etapa 1: Selecionar Plano */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Selecione o Plano</Label>
                <p className="text-sm text-slate-500 mt-1">Escolha o plano que será vinculado ao contrato</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map(plan => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all border-2 ${
                      selectedPlanId === plan.id
                        ? 'border-[#355340] bg-[#355340]/5'
                        : 'border-slate-200 hover:border-[#355340]/50'
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                      <div className="space-y-2 mt-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Valor mensal:</span>
                          <span className="font-medium">R$ {plan.monthly_value?.toLocaleString('pt-BR')}</span>
                        </div>
                        {plan.setup_fee && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Setup:</span>
                            <span className="font-medium">R$ {plan.setup_fee?.toLocaleString('pt-BR')}</span>
                          </div>
                        )}
                        {plan.min_contract_period && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Mínimo:</span>
                            <span className="font-medium">{plan.min_contract_period} meses</span>
                          </div>
                        )}
                      </div>

                      {activeContractForPlan && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>Já existe contrato ativo para este plano</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 2: Dados do Cliente */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Dados do Cliente</Label>
                <p className="text-sm text-slate-500 mt-1">Revise e complemente as informações do cliente</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Razão Social *</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Empresa LTDA"
                  />
                </div>

                <div>
                  <Label>CNPJ *</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <Label>Responsável *</Label>
                  <Input
                    value={formData.responsible_name}
                    onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                    placeholder="Nome Completo"
                  />
                </div>

                <div className="col-span-2">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>

                <div>
                  <Label>Telefone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Endereço</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número, complemento, cidade, estado"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label>Taxa de Setup (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.setup_fee}
                    onChange={(e) => setFormData({ ...formData, setup_fee: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Etapa 3: Preview */}
          {step === 3 && preview && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Preview do Contrato</Label>
                <p className="text-sm text-slate-500 mt-1">Revise o contrato antes de gerar o documento final</p>
              </div>

              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="pt-6">
                  <div className="bg-white p-6 rounded border border-slate-200 max-h-96 overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      <h2 className="text-lg font-bold mb-4">{preview.title}</h2>

                      <div className="text-sm space-y-4">
                        {preview.sections?.map((section, idx) => (
                          <div key={idx}>
                            <h3 className="font-semibold text-slate-900">{section.heading}</h3>
                            <p className="text-slate-700 whitespace-pre-line mt-1">{section.content}</p>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 mt-6 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Valor mensal:</span>
                          <span className="font-semibold">R$ {preview.monthly_value?.toLocaleString('pt-BR')}</span>
                        </div>
                        {preview.setup_fee > 0 && (
                          <div className="flex justify-between">
                            <span>Taxa de setup:</span>
                            <span className="font-semibold">R$ {preview.setup_fee?.toLocaleString('pt-BR')}</span>
                          </div>
                        )}
                        {preview.discount_percentage > 0 && (
                          <div className="flex justify-between text-amber-600">
                            <span>Desconto:</span>
                            <span className="font-semibold">-{preview.discount_percentage}%</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-2 font-bold">
                          <span>Total:</span>
                          <span className="text-[#355340]">R$ {preview.total_value?.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Carregando Preview */}
          {loadingPreview && (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <Loader className="h-8 w-8 animate-spin text-[#355340]" />
              <p className="text-slate-600">Gerando preview do contrato...</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={step === 1 ? () => onOpenChange(false) : handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {step < 3 && (
            <Button
              onClick={handleNext}
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={loadingPreview}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === 3 && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(2)}
              >
                Editar Dados
              </Button>
              <Button
                onClick={() => generatePDFMutation.mutate()}
                className="bg-[#355340] hover:bg-[#355340]/90"
                disabled={generatePDFMutation.isPending}
              >
                {generatePDFMutation.isPending ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Gerar Contrato
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}