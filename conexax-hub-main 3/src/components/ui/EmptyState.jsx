import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className 
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      {Icon && (
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-[#355340] hover:bg-[#355340]/90">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}