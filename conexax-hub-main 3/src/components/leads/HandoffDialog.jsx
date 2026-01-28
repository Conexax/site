import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function HandoffDialog({ open, onOpenChange, lead }) {
  const [formData, setFormData] = useState({
    closerId: "",
    fit: "",
    segment: lead?.segment || "",
    need: "",
    notes: lead?.qualification_notes || "",
    nextStep: ""
  });
  const [validationErrors, setValidationErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: closers = [] } = useQuery({
    queryKey: ['closers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'closer' || u.full_name?.includes('Closer'));
    },
    enabled: open
  });

  const performHandoffMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('performHandoff', { leadId: lead.id, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', lead?.id] });
      toast.success("Handoff realizado com sucesso!");
      onOpenChange(false);
      setFormData({
        closerId: "",
        fit: "",
        segment: lead?.segment || "",
        need: "",
        notes: "",
        nextStep: ""
      });
      setValidationErrors({});
    },
    onError: (error) => {
      toast.error("Erro ao realizar handoff: " + error.message);
    }
  });

  const validateForm = () => {
    const errors = {};
    if (!formData.closerId) errors.closerId = "Closer é obrigatório";
    if (!formData.fit) errors.fit = "Fit do lead é obrigatório";
    if (!formData.segment) errors.segment = "Segmento é obrigatório";
    if (!formData.need) errors.need = "Necessidade principal é obrigatória";
    if (!formData.notes.trim()) errors.notes = "Observações do SDR são obrigatórias";
    if (!formData.nextStep.trim()) errors.nextStep = "Próximo passo é obrigatório";
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    performHandoffMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Handoff para Closer</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info do Lead */}
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">Lead</p>
                  <p className="text-slate-900">{lead?.name}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Empresa</p>
                  <p className="text-slate-900">{lead?.company || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário */}
          <div className="space-y-4">
            {/* Closer */}
            <div>
              <Label htmlFor="closer" className="text-sm font-medium">
                Closer Responsável *
              </Label>
              <Select value={formData.closerId} onValueChange={(value) => setFormData({...formData, closerId: value})}>
                <SelectTrigger id="closer" className={validationErrors.closerId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione um closer" />
                </SelectTrigger>
                <SelectContent>
                  {closers.map(closer => (
                    <SelectItem key={closer.id} value={closer.id}>
                      {closer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.closerId && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors.closerId}
                </p>
              )}
            </div>

            {/* Fit */}
            <div>
              <Label htmlFor="fit" className="text-sm font-medium">
                Fit do Lead *
              </Label>
              <Select value={formData.fit} onValueChange={(value) => setFormData({...formData, fit: value})}>
                <SelectTrigger id="fit" className={validationErrors.fit ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione o fit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.fit && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors.fit}
                </p>
              )}
            </div>

            {/* Segmento */}
            <div>
              <Label htmlFor="segment" className="text-sm font-medium">
                Segmento *
              </Label>
              <Input
                id="segment"
                value={formData.segment}
                onChange={(e) => setFormData({...formData, segment: e.target.value})}
                placeholder="Ex: SaaS, E-commerce"
                className={validationErrors.segment ? "border-red-500" : ""}
              />
              {validationErrors.segment && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors.segment}
                </p>
              )}
            </div>

            {/* Necessidade */}
            <div>
              <Label htmlFor="need" className="text-sm font-medium">
                Necessidade Principal *
              </Label>
              <Input
                id="need"
                value={formData.need}
                onChange={(e) => setFormData({...formData, need: e.target.value})}
                placeholder="Ex: Automação de vendas"
                className={validationErrors.need ? "border-red-500" : ""}
              />
              {validationErrors.need && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors.need}
                </p>
              )}
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Observações do SDR *
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Detalhes da qualificação e contexto para o closer"
                className={`h-24 ${validationErrors.notes ? "border-red-500" : ""}`}
              />
              {validationErrors.notes && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors.notes}
                </p>
              )}
            </div>

            {/* Próximo Passo */}
            <div>
              <Label htmlFor="nextStep" className="text-sm font-medium">
                Próximo Passo Recomendado *
              </Label>
              <Input
                id="nextStep"
                value={formData.nextStep}
                onChange={(e) => setFormData({...formData, nextStep: e.target.value})}
                placeholder="Ex: Agendar reunião de discovery"
                className={validationErrors.nextStep ? "border-red-500" : ""}
              />
              {validationErrors.nextStep && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors.nextStep}
                </p>
              )}
            </div>
          </div>

          {/* Aviso */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4 text-sm text-amber-800">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Ao confirmar, o lead será marcado como <strong>Qualificado</strong> e transferido para o closer selecionado. Esta ação é auditada.
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={performHandoffMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={performHandoffMutation.isPending}
            className="bg-[#355340] hover:bg-[#355340]/90"
          >
            {performHandoffMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Handoff
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}