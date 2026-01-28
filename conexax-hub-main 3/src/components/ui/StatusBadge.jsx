import React from "react";
import { cn } from "@/lib/utils";

const statusStyles = {
  // Client status
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  onboarding: "bg-blue-50 text-blue-700 border-blue-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  
  // Activity status
  pending: "bg-slate-50 text-slate-700 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  
  // Contract status
  draft: "bg-slate-50 text-slate-700 border-slate-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  signed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negotiation: "bg-amber-50 text-amber-700 border-amber-200",
  ended: "bg-slate-50 text-slate-700 border-slate-200",
  
  // Priority
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
  
  // Integration
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  disconnected: "bg-red-50 text-red-700 border-red-200",
  
  // Default
  inactive: "bg-slate-50 text-slate-500 border-slate-200"
};

const statusLabels = {
  active: "Ativo",
  onboarding: "Onboarding",
  paused: "Pausado",
  cancelled: "Cancelado",
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluída",
  overdue: "Atrasada",
  draft: "Rascunho",
  sent: "Enviado",
  signed: "Assinado",
  negotiation: "Em Negociação",
  ended: "Encerrado",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  connected: "Conectado",
  disconnected: "Desconectado",
  inactive: "Inativo"
};

export default function StatusBadge({ status, className }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      statusStyles[status] || statusStyles.inactive,
      className
    )}>
      {statusLabels[status] || status}
    </span>
  );
}