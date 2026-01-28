import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  healthy: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    label: "Saudável"
  },
  stretched: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "Esticado"
  },
  overloaded: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Sobrecarregado"
  }
};

export default function SquadHealthBadge({ status = "healthy", score, onClick, className = "" }) {
  const config = statusConfig[status] || statusConfig.healthy;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all hover:shadow-md",
        config.bgColor,
        config.borderColor,
        config.color,
        "cursor-pointer",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="text-xs opacity-75">({Math.round(score)})</span>
      )}
    </button>
  );
}