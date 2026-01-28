import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  User, 
  CheckCircle2, 
  ArrowRight, 
  Building2,
  Mail,
  Phone,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

const stageConfig = {
  captado: { label: "Lead Captado", color: "bg-slate-100 border-slate-300 text-slate-700" },
  qualificado: { label: "Qualificado", color: "bg-blue-100 border-blue-300 text-blue-700" },
  handoff: { label: "Handoff", color: "bg-purple-100 border-purple-300 text-purple-700" },
  fechado: { label: "Fechado", color: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  descartado: { label: "Descartado", color: "bg-red-100 border-red-300 text-red-700" }
};

export default function LeadPipelineView({ lead, onUpdate }) {
  const queryClient = useQueryClient();
  const [qualifyDialogOpen, setQualifyDialogOpen] = useState(false);
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const [qualifyData, setQualifyData] = useState({
    qualification_fit: "medio",
    qualification_company_size: "",
    qualification_need: "",
    qualification_notes: ""
  });

  const [handoffData, setHandoffData] = useState({
    toUserId: "",
    notes: ""
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  const closers = users.filter(u => u.role === 'admin' || u.full_name?.toLowerCase().includes('closer'));

  const qualifyMutation = useMutation({
    mutationFn: () => base44.functions.invoke('qualifyLead', {
      leadId: lead.id,
      ...qualifyData
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead qualificado com sucesso!");
      setQualifyDialogOpen(false);
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const handoffMutation = useMutation({
    mutationFn: () => base44.functions.invoke('handoffLead', {
      leadId: lead.id,
      ...handoffData
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Handoff realizado com sucesso!");
      setHandoffDialogOpen(false);
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const closeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('closeLead', {
      leadId: lead.id
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (result.data.was_duplicate) {
        toast.success("Lead fechado e vinculado a cliente existente!");
      } else {
        toast.success("Lead fechado e cliente criado com sucesso!");
      }
      setCloseDialogOpen(false);
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const currentStage = lead.pipeline_stage || 'captado';
  const config = stageConfig[currentStage];

  return (
    <div className="space-y-4">
      {/* Pipeline Status Card */}
      <div className="border-2 border-dashed rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Estágio Atual</p>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${config.color} font-medium`}>
              <CheckCircle2 className="h-4 w-4" />
              {config.label}
            </div>
          </div>
        </div>

        {/* Lead Info */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <User className="h-4 w-4" />
            {lead.name}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="h-4 w-4" />
            {lead.email}
          </div>
          {lead.company && (
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="h-4 w-4" />
              {lead.company}
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="h-4 w-4" />
              {lead.phone}
            </div>
          )}
        </div>

        {/* Responsible */}
        {lead.responsible_name && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Responsável Atual</p>
            <p className="text-sm font-medium text-slate-900">
              {lead.responsible_name}
              {lead.responsible_type && (
                <span className="ml-2 text-xs text-slate-500">
                  ({lead.responsible_type === 'sdr' ? 'SDR' : lead.responsible_type === 'closer' ? 'Closer' : 'Admin'})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {currentStage === 'captado' && (
            <Button
              onClick={() => setQualifyDialogOpen(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Qualificar Lead
            </Button>
          )}

          {currentStage === 'qualificado' && (
            <Button
              onClick={() => setHandoffDialogOpen(true)}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Fazer Handoff
            </Button>
          )}

          {currentStage === 'handoff' && (
            <Button
              onClick={() => setCloseDialogOpen(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Fechar Lead
            </Button>
          )}
        </div>

        {/* Timeline */}
        {(lead.qualified_date || lead.handoff_date || lead.closed_date) && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-2">Histórico</p>
            <div className="space-y-2 text-xs">
              {lead.qualified_date && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-3 w-3" />
                  <span>Qualificado em {format(new Date(lead.qualified_date), "dd/MM/yyyy 'às' HH:mm")}</span>
                  {lead.qualified_by_name && <span className="text-slate-500">por {lead.qualified_by_name}</span>}
                </div>
              )}
              {lead.handoff_date && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-3 w-3" />
                  <span>Handoff em {format(new Date(lead.handoff_date), "dd/MM/yyyy 'às' HH:mm")}</span>
                  {lead.handoff_from_name && <span className="text-slate-500">de {lead.handoff_from_name}</span>}
                </div>
              )}
              {lead.closed_date && (
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Fechado em {format(new Date(lead.closed_date), "dd/MM/yyyy 'às' HH:mm")}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Qualify Dialog */}
      <Dialog open={qualifyDialogOpen} onOpenChange={setQualifyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Qualificar Lead</DialogTitle>
            <DialogDescription>
              Preencha os critérios de qualificação do lead
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Fit do Lead *</Label>
              <Select
                value={qualifyData.qualification_fit}
                onValueChange={(v) => setQualifyData({ ...qualifyData, qualification_fit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tamanho da Empresa</Label>
              <Input
                placeholder="Ex: 10-50 funcionários"
                value={qualifyData.qualification_company_size}
                onChange={(e) => setQualifyData({ ...qualifyData, qualification_company_size: e.target.value })}
              />
            </div>
            <div>
              <Label>Necessidade Identificada</Label>
              <Textarea
                placeholder="Descreva a necessidade do lead..."
                value={qualifyData.qualification_need}
                onChange={(e) => setQualifyData({ ...qualifyData, qualification_need: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Notas do SDR</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={qualifyData.qualification_notes}
                onChange={(e) => setQualifyData({ ...qualifyData, qualification_notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQualifyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => qualifyMutation.mutate()}
              disabled={qualifyMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {qualifyMutation.isPending ? "Qualificando..." : "Qualificar Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handoff Dialog */}
      <Dialog open={handoffDialogOpen} onOpenChange={setHandoffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fazer Handoff</DialogTitle>
            <DialogDescription>
              Transferir o lead para um closer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Closer Responsável *</Label>
              <Select
                value={handoffData.toUserId}
                onValueChange={(v) => setHandoffData({ ...handoffData, toUserId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um closer" />
                </SelectTrigger>
                <SelectContent>
                  {closers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações do Handoff</Label>
              <Textarea
                placeholder="Contexto e informações para o closer..."
                value={handoffData.notes}
                onChange={(e) => setHandoffData({ ...handoffData, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandoffDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => handoffMutation.mutate()}
              disabled={!handoffData.toUserId || handoffMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {handoffMutation.isPending ? "Transferindo..." : "Fazer Handoff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Lead</DialogTitle>
            <DialogDescription>
              Converter o lead em cliente
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-emerald-800">
                <strong>Atenção:</strong> Esta ação irá criar automaticamente um cliente no CRM com os dados do lead.
                Se já existir um cliente com o mesmo e-mail, CNPJ ou domínio, o lead será vinculado ao cliente existente.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Empresa:</strong> {lead.company || "Não informado"}</p>
              <p><strong>Email:</strong> {lead.email}</p>
              <p><strong>Responsável:</strong> {lead.responsible_name || "Não informado"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {closeMutation.isPending ? "Fechando..." : "Confirmar Fechamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}