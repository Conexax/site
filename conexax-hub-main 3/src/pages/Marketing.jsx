import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Mail, 
  Plus, 
  Send, 
  Clock, 
  Users, 
  TrendingUp,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { AuditPageView } from "@/components/audit/AuditLogger";

export default function Marketing() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    subject: "",
    content: "",
    target_audience: "all_leads"
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    subject: "",
    content: "",
    category: "custom"
  });

  const [automationForm, setAutomationForm] = useState({
    name: "",
    description: "",
    trigger_type: "lead_stage_change",
    trigger_stage: "captado",
    delay_days: 0,
    template_id: "",
    subject: "",
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.EmailCampaign.list("-created_date")
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => base44.entities.EmailTemplate.list()
  });

  const { data: automations = [] } = useQuery({
    queryKey: ["automations"],
    queryFn: () => base44.entities.EmailAutomation.list()
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list()
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailCampaign.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha criada!");
      setCampaignDialogOpen(false);
      resetCampaignForm();
    }
  });

  const sendCampaignMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('sendCampaignEmail', { campaignId: id }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(`Campanha enviada! ${result.data.sent_count} emails enviados.`);
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template criado!");
      setTemplateDialogOpen(false);
      resetTemplateForm();
    }
  });

  const createAutomationMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailAutomation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automação criada!");
      setAutomationDialogOpen(false);
      resetAutomationForm();
    }
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.EmailAutomation.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automação atualizada!");
    }
  });

  const resetCampaignForm = () => {
    setCampaignForm({
      name: "",
      subject: "",
      content: "",
      target_audience: "all_leads"
    });
    setEditingItem(null);
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      description: "",
      subject: "",
      content: "",
      category: "custom"
    });
    setEditingItem(null);
  };

  const resetAutomationForm = () => {
    setAutomationForm({
      name: "",
      description: "",
      trigger_type: "lead_stage_change",
      trigger_stage: "captado",
      delay_days: 0,
      template_id: "",
      subject: "",
      is_active: true
    });
    setEditingItem(null);
  };

  const getAudienceCount = (targetAudience) => {
    if (targetAudience === "all_leads") return leads.length;
    return leads.filter(l => l.pipeline_stage === targetAudience).length;
  };

  return (
    <>
      <AuditPageView pageName="Marketing" />
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Marketing & Automação</h1>
            <p className="text-slate-500 text-sm mt-1">Gerencie campanhas e automações de email</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Campanhas</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{campaigns.length}</p>
                </div>
                <Mail className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Templates</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{templates.length}</p>
                </div>
                <Copy className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Automações Ativas</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {automations.filter(a => a.is_active).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Leads Totais</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{leads.length}</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="automations">Automações</TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCampaignDialogOpen(true)} className="bg-[#355340]">
                <Plus className="h-4 w-4 mr-2" />
                Nova Campanha
              </Button>
            </div>

            <div className="grid gap-4">
              {campaigns.map(campaign => (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{campaign.subject}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant={
                            campaign.status === 'sent' ? 'default' :
                            campaign.status === 'sending' ? 'secondary' : 'outline'
                          }>
                            {campaign.status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {getAudienceCount(campaign.target_audience)} destinatários
                          </span>
                          {campaign.sent_count > 0 && (
                            <span className="text-xs text-emerald-600">
                              {campaign.sent_count} enviados
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {campaign.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => sendCampaignMutation.mutate(campaign.id)}
                            disabled={sendCampaignMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Enviar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setTemplateDialogOpen(true)} className="bg-[#355340]">
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {templates.map(template => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500">{template.description}</p>
                    <div className="mt-3">
                      <Badge>{template.category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Automations Tab */}
          <TabsContent value="automations" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setAutomationDialogOpen(true)} className="bg-[#355340]">
                <Plus className="h-4 w-4 mr-2" />
                Nova Automação
              </Button>
            </div>

            <div className="grid gap-4">
              {automations.map(automation => (
                <Card key={automation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{automation.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{automation.description}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                            {automation.is_active ? 'Ativa' : 'Pausada'}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {automation.sent_count || 0} enviados
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAutomationMutation.mutate({
                          id: automation.id,
                          is_active: !automation.is_active
                        })}
                      >
                        {automation.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Campaign Dialog */}
        <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Campanha</Label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="Ex: Campanha de Boas-vindas"
                />
              </div>
              <div>
                <Label>Assunto do Email</Label>
                <Input
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                  placeholder="Ex: Bem-vindo à nossa plataforma!"
                />
              </div>
              <div>
                <Label>Público-Alvo</Label>
                <Select
                  value={campaignForm.target_audience}
                  onValueChange={(v) => setCampaignForm({ ...campaignForm, target_audience: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_leads">Todos os Leads ({leads.length})</SelectItem>
                    <SelectItem value="captado">Leads Captados ({getAudienceCount('captado')})</SelectItem>
                    <SelectItem value="qualificado">Leads Qualificados ({getAudienceCount('qualificado')})</SelectItem>
                    <SelectItem value="handoff">Leads em Handoff ({getAudienceCount('handoff')})</SelectItem>
                    <SelectItem value="descartado">Leads Descartados ({getAudienceCount('descartado')})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conteúdo do Email</Label>
                <Textarea
                  value={campaignForm.content}
                  onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
                  placeholder="Olá {{nome}}, seja bem-vindo..."
                  rows={10}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use variáveis: {"{"}{"{"} nome {"}"}{"}"}{"{"}, {"{"}{"{"} empresa {"}"}{"}"}{"{"}, {"{"}{"{"} email {"}"}{"}{"}"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => createCampaignMutation.mutate(campaignForm)}
                disabled={!campaignForm.name || !campaignForm.subject || !campaignForm.content}
                className="bg-[#355340]"
              >
                Criar Campanha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Template</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(v) => setTemplateForm({ ...templateForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">Boas-vindas</SelectItem>
                    <SelectItem value="nurturing">Nutrição</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="conversion">Conversão</SelectItem>
                    <SelectItem value="reengagement">Reengajamento</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assunto Padrão</Label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Conteúdo HTML</Label>
                <Textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  rows={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => createTemplateMutation.mutate(templateForm)}
                disabled={!templateForm.name || !templateForm.content}
                className="bg-[#355340]"
              >
                Criar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Automation Dialog */}
        <Dialog open={automationDialogOpen} onOpenChange={setAutomationDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Automação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Automação</Label>
                <Input
                  value={automationForm.name}
                  onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo de Gatilho</Label>
                <Select
                  value={automationForm.trigger_type}
                  onValueChange={(v) => setAutomationForm({ ...automationForm, trigger_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead_stage_change">Mudança de Estágio</SelectItem>
                    <SelectItem value="lead_created">Lead Criado</SelectItem>
                    <SelectItem value="lead_inactive">Lead Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {automationForm.trigger_type === 'lead_stage_change' && (
                <div>
                  <Label>Estágio do Pipeline</Label>
                  <Select
                    value={automationForm.trigger_stage}
                    onValueChange={(v) => setAutomationForm({ ...automationForm, trigger_stage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="captado">Captado</SelectItem>
                      <SelectItem value="qualificado">Qualificado</SelectItem>
                      <SelectItem value="handoff">Handoff</SelectItem>
                      <SelectItem value="descartado">Descartado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Template</Label>
                <Select
                  value={automationForm.template_id}
                  onValueChange={(v) => setAutomationForm({ ...automationForm, template_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assunto do Email</Label>
                <Input
                  value={automationForm.subject}
                  onChange={(e) => setAutomationForm({ ...automationForm, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Atraso (dias)</Label>
                <Input
                  type="number"
                  value={automationForm.delay_days}
                  onChange={(e) => setAutomationForm({ ...automationForm, delay_days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAutomationDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => createAutomationMutation.mutate(automationForm)}
                disabled={!automationForm.name || !automationForm.template_id || !automationForm.subject}
                className="bg-[#355340]"
              >
                Criar Automação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}