import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Wrapper padronizado para campos de formulário com validação e acessibilidade
export function FormField({ 
  label, 
  error, 
  required, 
  children, 
  hint,
  className 
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label className="font-medium text-sm">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

export default FormField;