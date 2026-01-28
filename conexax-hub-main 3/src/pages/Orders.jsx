import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Orders() {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 100),
  });

  const statusColors = {
    pago: "bg-green-100 text-green-800",
    pendente: "bg-yellow-100 text-yellow-800",
    cancelado: "bg-red-100 text-red-800",
    reembolsado: "bg-gray-100 text-gray-800"
  };

  const statusLabels = {
    pago: "Pago",
    pendente: "Pendente",
    cancelado: "Cancelado",
    reembolsado: "Reembolsado"
  };

  const providerLabels = {
    yampi: "Yampi",
    shopify: "Shopify",
    kiwify: "Kiwify"
  };

  const filteredOrders = orders.filter(order => {
    const matchSearch = 
      order.externalOrderId.toLowerCase().includes(search.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (order.customerEmail && order.customerEmail.toLowerCase().includes(search.toLowerCase()));
    const matchProvider = providerFilter === "todos" || order.provider === providerFilter;
    const matchStatus = statusFilter === "todos" || order.status === statusFilter;
    return matchSearch && matchProvider && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pedidos</h1>
          <p className="text-slate-600 mt-1">Acompanhe todos os pedidos recebidos</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar pedidos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="yampi">Yampi</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="kiwify">Kiwify</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                  <SelectItem value="reembolsado">Reembolsados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm">
                      {format(new Date(order.created_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{providerLabels[order.provider]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{order.externalOrderId}</TableCell>
                    <TableCell className="text-sm">{order.customerName || "-"}</TableCell>
                    <TableCell className="font-medium">R$ {order.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Pedido</p>
                  <p className="font-mono">{selectedOrder.externalOrderId}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Provedor</p>
                  <Badge variant="outline">{providerLabels[selectedOrder.provider]}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Valor</p>
                  <p className="font-medium text-lg">R$ {selectedOrder.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <Badge className={statusColors[selectedOrder.status]}>
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </div>
              </div>
              {selectedOrder.customerName && (
                <div>
                  <p className="text-sm text-slate-600">Cliente</p>
                  <p>{selectedOrder.customerName}</p>
                  {selectedOrder.customerEmail && (
                    <p className="text-sm text-slate-500">{selectedOrder.customerEmail}</p>
                  )}
                </div>
              )}
              {selectedOrder.productName && (
                <div>
                  <p className="text-sm text-slate-600">Produto</p>
                  <p>{selectedOrder.productName}</p>
                </div>
              )}
              {selectedOrder.rawData && (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Dados Completos</p>
                  <pre className="bg-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedOrder.rawData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}