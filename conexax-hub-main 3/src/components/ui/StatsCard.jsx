import React from "react";
import { cn } from "@/lib/utils";

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendUp,
  className,
  iconClassName 
}) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              "text-xs font-medium flex items-center gap-1",
              trendUp ? "text-emerald-600" : "text-red-500"
            )}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "p-3 rounded-xl",
            iconClassName || "bg-[#62997f]/10"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              iconClassName ? "text-white" : "text-[#355340]"
            )} />
          </div>
        )}
      </div>
    </div>
  );
}