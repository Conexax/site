import React, { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import ChurnDashboard from "./ChurnDashboard";

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    label: "Saudável",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    iconColor: "text-emerald-600"
  },
  attention: {
    icon: AlertTriangle,
    label: "Atenção",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    iconColor: "text-yellow-600"
  },
  risk: {
    icon: AlertCircle,
    label: "Risco Alto",
    color: "bg-red-100 text-red-800 border-red-200",
    iconColor: "text-red-600"
  }
};

export default function ChurnIndicator({ client, showDetails = false, size = "default" }) {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const status = client.churn_status || "healthy";
  const score = client.churn_score || 0;
  const factors = client.churn_factors || [];
  
  const config = statusConfig[status] || statusConfig.healthy;
  const Icon = config.icon;

  const BadgeButton = React.forwardRef((props, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 border rounded-md px-2.5 py-0.5 font-semibold cursor-pointer transition-all hover:opacity-80 hover:shadow-md",
        config.color,
        size === "sm" && "text-xs py-0.5 px-2"
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDashboardOpen(true);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setDashboardOpen(true);
        }
      }}
      {...props}
    >
      <Icon className={cn("h-3.5 w-3.5", config.iconColor)} />
      <span className="text-xs">{config.label}</span>
    </div>
  ));

  const content = !showDetails || factors.length === 0 ? (
    <BadgeButton />
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <BadgeButton />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Score de Risco: {score.toFixed(0)}/100</p>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">Fatores de risco:</p>
              {factors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <Info className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-600 font-medium mt-2">Clique para ver detalhes completos</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <>
      {content}
      <ChurnDashboard 
        open={dashboardOpen} 
        onClose={() => setDashboardOpen(false)} 
        client={client} 
      />
    </>
  );
}