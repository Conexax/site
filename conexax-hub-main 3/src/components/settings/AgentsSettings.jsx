import React, { useState, useEffect } from "react";
import { Bot, Plus, Trash2, MessageSquare, Settings, Edit2, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function AgentsSettings() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    whatsapp_greeting: "",
    tools: []
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      // Simular carregamento de agentes do diretório agents/
      // Por enquanto, vazio até implementarmos a listagem real
      setAgents([]);
    } catch (error) {
      console.error("Erro ao carregar agentes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const agentFileName = formData.name.toLowerCase().replace(/\s+/g, '_');
      
      const agentConfig = {
        description: formData.description,
        instructions: formData.instructions,
        tool_configs: formData.tools,
        whatsapp_greeting: formData.whatsapp_greeting || undefined
      };

      // Criar arquivo do agente
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: `agents/${agentFileName}.json`,
          content: JSON.stringify(agentConfig, null, 2)
        })
      });

      if (!response.ok) throw new Error("Erro ao criar agente");

      toast.success("Agente criado com sucesso");
      loadAgents();
      handleCloseDialog();
    } catch (error) {
      toast.error("Erro ao criar agente");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAgent(null);
    setFormData({
      name: "",
      description: "",
      instructions: "",
      whatsapp_greeting: "",
      tools: []
    });
  };

  const addEntityTool = () => {
    setFormData({
      ...formData,
      tools: [...formData.tools, {
        entity_name: "",
        allowed_operations: []
      }]
    });
  };

  const updateEntityTool = (index, field, value) => {
    const newTools = [...formData.tools];
    newTools[index][field] = value;
    setFormData({ ...formData, tools: newTools });
  };

  const removeEntityTool = (index) => {
    setFormData({
      ...formData,
      tools: formData.tools.filter((_, i) => i !== index)
    });
  };

  const toggleOperation = (toolIndex, operation) => {
    const newTools = [...formData.tools];
    const currentOps = newTools[toolIndex].allowed_operations || [];
    
    newTools[toolIndex].allowed_operations = currentOps.includes(operation)
      ? currentOps.filter(op => op !== operation)
      : [...currentOps, operation];
    
    setFormData({ ...formData, tools: newTools });
  };

  const availableEntities = ["Client", "Activity", "Contract", "Metric", "Lead", "Order"];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agentes de IA</h1>
          <p className="text-slate-500 mt-1">Configure agentes de IA para automatizar tarefas</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#355340] hover:bg-[#355340]/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      {loading ? (
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">Carregando agentes...</p>
          </CardContent>
        </Card>
      ) : agents.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <Bot className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum agente configurado</h3>
            <p className="text-slate-500 mb-6">
              Crie seu primeiro agente de IA para atendimento e automação
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-[#355340] hover:bg-[#355340]/90">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => (
            <Card key={agent.name} className="border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#62997f]/20">
                      <Bot className="h-5 w-5 text-[#355340]" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{agent.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {agent.tool_configs?.length || 0} ferramentas
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agente de IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Agente *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Assistente de Atendimento"
              />
            </div>

            <div>
              <Label>Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o propósito deste agente..."
                rows={2}
              />
            </div>

            <div>
              <Label>Instruções *</Label>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Instruções detalhadas sobre como o agente deve se comportar e responder..."
                rows={4}
              />
            </div>

            <div>
              <Label>Mensagem de Boas-Vindas WhatsApp (opcional)</Label>
              <Textarea
                value={formData.whatsapp_greeting}
                onChange={(e) => setFormData({ ...formData, whatsapp_greeting: e.target.value })}
                placeholder="Olá! Sou o assistente virtual da ConexaX. Como posso ajudar?"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Ferramentas (Entidades)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEntityTool}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Entidade
                </Button>
              </div>
              
              {formData.tools.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">
                  Nenhuma ferramenta configurada. Adicione entidades que o agente pode acessar.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.tools.map((tool, index) => (
                    <Card key={index} className="border-slate-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-3">
                            <Select 
                              value={tool.entity_name} 
                              onValueChange={(v) => updateEntityTool(index, 'entity_name', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a entidade" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableEntities.map((entity) => (
                                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <div>
                              <p className="text-xs text-slate-500 mb-2">Operações permitidas:</p>
                              <div className="flex flex-wrap gap-2">
                                {["create", "read", "update", "delete"].map((op) => (
                                  <Button
                                    key={op}
                                    type="button"
                                    variant={(tool.allowed_operations || []).includes(op) ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleOperation(index, op)}
                                    className={(tool.allowed_operations || []).includes(op) ? "bg-[#355340] hover:bg-[#355340]/90 text-xs" : "text-xs"}
                                  >
                                    {op === "create" ? "Criar" : 
                                     op === "read" ? "Ler" : 
                                     op === "update" ? "Atualizar" : "Excluir"}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEntityTool(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleCreateAgent} 
              className="bg-[#355340] hover:bg-[#355340]/90"
              disabled={!formData.name || !formData.description || !formData.instructions}
            >
              Criar Agente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}