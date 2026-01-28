import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Copy, Plus, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import EmptyState from "@/components/ui/EmptyState";

const statusConfig = {
  PENDING: { label: "Pendente", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  RECEIVED: { label: "Pago", icon: CheckCircle2, color: "bg-green-100 text-green-800" },
  CONFIRMED: { label: "Pago", icon: CheckCircle2, color: "bg-green-100 text-green-800" },
  OVERDUE: { label: "Vencido", icon: AlertCircle, color: "bg-red-100 text-red-800" }
};

export default function Payments() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    description: ""
  });
  const [createdCharge, setCreatedCharge] = useState(null);
  const queryClient = useQueryClient();

  const { data: billingLinks = [] } = useQuery({
    queryKey: ["billingLinks"],
    queryFn: () => base44.entities.BillingLink.list("-created_date", 500),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const createChargeMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/functions/create-asaas-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar cobrança");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billingLinks"] });
      setCreatedCharge(data);
      toast.success("Cobrança criada com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleCreateCharge = () => {
    if (!selectedCustomer || !formData.amount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createChargeMutation.mutate({
      customerId: selectedCustomer,
      amount: parseFloat(formData.amount),
      dueDate: formData.dueDate,
      description: formData.description
    });
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleSendWhatsApp = (customer, url) => {
    const message = `Olá ${customer.name}, aqui está o link para pagamento: ${url}`;
    const whatsappUrl = `https://wa.me/${customer.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const filteredLinks = billingLinks.filter(link => {
    if (statusFilter === "all") return true;
    return link.status === statusFilter;
  });

  const getCustomer = (customerId) => {
    return customers.find(c => c.id === customerId);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCreatedCharge(null);
    setSelectedCustomer("");
    setFormData({
      amount: "",
      dueDate: format(new Date(), "yyyy-MM-dd"),
      description: ""
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pagamentos</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie cobranças e pagamentos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          Cobrar agora
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="RECEIVED">Pago</SelectItem>
              <SelectItem value="OVERDUE">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredLinks.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nenhuma cobrança encontrada"
              description="Crie uma nova cobrança para começar"
              actionLabel="Cobrar agora"
              onAction={() => setDialogOpen(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link) => {
                  const customer = getCustomer(link.customerId);
                  const status = statusConfig[link.status];
                  const StatusIcon = status?.icon;

                  return (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">
                        {customer?.name || "-"}
                      </TableCell>
                      <TableCell>
                        R$ {link.amount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {link.dueDate ? format(new Date(link.dueDate), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={status?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {link.billingUrl && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyLink(link.billingUrl)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copiar
                              </Button>
                              {customer?.phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendWhatsApp(customer, link.billingUrl)}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  WhatsApp
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdCharge ? "Cobrança criada!" : "Nova cobrança"}
            </DialogTitle>
          </DialogHeader>

          {!createdCharge ? (
            <div className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Pagamento de serviço"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  Link de pagamento gerado com sucesso!
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleCopyLink(createdCharge.invoiceUrl)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar link
                </Button>
                {customers.find(c => c.id === selectedCustomer)?.phone && (
                  <Button
                    className="flex-1"
                    onClick={() => handleSendWhatsApp(
                      customers.find(c => c.id === selectedCustomer),
                      createdCharge.invoiceUrl
                    )}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {!createdCharge ? (
              <>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateCharge}
                  disabled={createChargeMutation.isPending}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {createChargeMutation.isPending ? "Criando..." : "Criar cobrança"}
                </Button>
              </>
            ) : (
              <Button onClick={handleCloseDialog} className="w-full">
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}