import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Ícone clickável com tamanho mínimo 40x40px (acessibilidade)
export const AccessibleIcon = React.forwardRef(
  ({ icon: Icon, onClick, disabled, className, title, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className={cn("h-10 w-10", className)}
      title={title}
      {...props}
    >
      <Icon className="h-5 w-5" />
    </Button>
  )
);

AccessibleIcon.displayName = "AccessibleIcon";
export default AccessibleIcon;