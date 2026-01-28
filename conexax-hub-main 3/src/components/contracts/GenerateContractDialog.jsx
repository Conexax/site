import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Eye, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GenerateContractDialog({ open, onClose, client, leadId = null }) {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedContract, setGeneratedContract] = useState(null);
  const [preview, setPreview] = useState("");

  const [params, setParams] = useState({
    monthlyValue: 0,
    setupFee: 0,
    discountPercentage: 0,
    validityMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["contractTemplates"],
    queryFn: () => base44.entities.ContractTemplate.filter({ status: "active" }),
  });

  const handlePlanChange = (planId) => {
    setSelectedPlan(planId);
    const plan = plans.find(p => p.id === planId);
    const template = templates.find(t => t.plan_id === planId && t.status === 'active');
    
    setSelectedTemplate(template);
    
    if (plan) {
      setParams({
        ...params,
        monthlyValue: plan.monthly_value || 0,
        validityMonths: plan.default_duration_months || 12
      });
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate || !client) return;

    const finalValue = params.monthlyValue * (1 - params.discountPercentage / 100);
    const totalValue = finalValue * params.validityMonths;
    const plan = plans.find(p => p.id === selectedPlan);

    let content = selectedTemplate.content;

    const now = new Date();
    const endDate = new Date(params.startDate);
    endDate.setMonth(endDate.getMonth() + params.validityMonths);

    const variables = {
      '{{COMPANY_NAME}}': client.company_name || '',
      '{{CNPJ}}': client.cnpj || '',
      '{{RESPONSIBLE_NAME}}': client.responsible_name || '',
      '{{EMAIL}}': client.email || '',
      '{{PHONE}}': client.phone || '',
      '{{SEGMENT}}': client.segment || '',
      '{{PLAN_NAME}}': plan?.name || '',
      '{{MONTHLY_VALUE}}': params.monthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      '{{FINAL_MONTHLY_VALUE}}': finalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      '{{SETUP_FEE}}': params.setupFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      '{{DISCOUNT_PERCENTAGE}}': params.discountPercentage.toString(),
      '{{VALIDITY_MONTHS}}': params.validityMonths.toString(),
      '{{TOTAL_VALUE}}': totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      '{{CONTRACT_NUMBER}}': 'PREVIEW',
      '{{START_DATE}}': new Date(params.startDate).toLocaleDateString('pt-BR'),
      '{{END_DATE}}': endDate.toLocaleDateString('pt-BR'),
      '{{GENERATION_DATE}}': now.toLocaleDateString('pt-BR'),
      '{{GENERATED_BY}}': 'Pré-visualização'
    };

    Object.entries(variables).forEach(([key, value]) => {
      content = content.replaceAll(key, value);
    });

    setPreview(content);
    setStep(2);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateContract', {
        clientId: client.id,
        planId: selectedPlan,
        templateId: selectedTemplate.id,
        monthlyValue: params.monthlyValue,
        setupFee: params.setupFee,
        discountPercentage: params.discountPercentage,
        validityMonths: params.validityMonths,
        startDate: params.startDate,
        notes: params.notes
      });

      if (response.data.success) {
        setGeneratedContract(response.data);
        setStep(3);
        toast.success("Contrato gerado com sucesso!");
      } else {
        toast.error(response.data.error || "Erro ao gerar contrato");
      }
    } catch (error) {
      toast.error("Erro ao gerar contrato");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedPlan("");
    setSelectedTemplate(null);
    setPreview("");
    setGeneratedContract(null);
    setParams({
      monthlyValue: 0,
      setupFee: 0,
      discountPercentage: 0,
      validityMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
      notes: ""
    });
    onClose();
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Contrato</DialogTitle>
          <p className="text-sm text-slate-500">{client.company_name}</p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Selecione o Plano</Label>
              <Select value={selectedPlan} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.monthly_value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <>
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">Modelo encontrado: {selectedTemplate.template_name}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor Mensal (R$)</Label>
                    <Input
                      type="number"
                      value={params.monthlyValue}
                      onChange={(e) => setParams({ ...params, monthlyValue: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Vigência (meses)</Label>
                    <Input
                      type="number"
                      value={params.validityMonths}
                      onChange={(e) => setParams({ ...params, validityMonths: parseInt(e.target.value) || 12 })}
                      disabled={!selectedTemplate.allow_custom_duration}
                    />
                  </div>
                  {selectedTemplate.allow_setup_fee && (
                    <div>
                      <Label>Taxa de Setup (R$)</Label>
                      <Input
                        type="number"
                        value={params.setupFee}
                        onChange={(e) => setParams({ ...params, setupFee: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                  {selectedTemplate.allow_discount && (
                    <div>
                      <Label>Desconto (%)</Label>
                      <Input
                        type="number"
                        value={params.discountPercentage}
                        onChange={(e) => setParams({ ...params, discountPercentage: parseFloat(e.target.value) || 0 })}
                        max="100"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Data de Início</Label>
                    <Input
                      type="date"
                      value={params.startDate}
                      onChange={(e) => setParams({ ...params, startDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    value={params.notes}
                    onChange={(e) => setParams({ ...params, notes: e.target.value })}
                    rows={3}
                    placeholder="Condições especiais, ajustes negociados..."
                  />
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-800">
                  <Eye className="h-4 w-4 inline mr-2" />
                  Pré-visualização do contrato antes de gerar
                </p>
              </CardContent>
            </Card>

            <div className="bg-white border rounded-lg p-6 max-h-96 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700">
                {preview}
              </pre>
            </div>
          </div>
        )}

        {step === 3 && generatedContract && (
          <div className="space-y-4">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                  <p className="font-semibold text-emerald-900">Contrato Gerado com Sucesso!</p>
                  <p className="text-sm text-emerald-700 mt-1">Número: {generatedContract.contract_number}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Link to={createPageUrl("Contracts")} className="flex-1">
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Contratos
                </Button>
              </Link>
              <Button onClick={handleClose} className="flex-1 bg-[#355340] hover:bg-[#355340]/90">
                Concluir
              </Button>
            </div>
          </div>
        )}

        {step < 3 && (
          <DialogFooter>
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {step === 1 && (
              <Button 
                onClick={handlePreview}
                disabled={!selectedTemplate || !params.monthlyValue}
                className="bg-[#355340] hover:bg-[#355340]/90"
              >
                <Eye className="h-4 w-4 mr-2" />
                Pré-visualizar
              </Button>
            )}
            {step === 2 && (
              <Button 
                onClick={handleGenerate}
                disabled={generating}
                className="bg-[#355340] hover:bg-[#355340]/90"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Gerar Contrato
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}