import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = "Confirmar exclusão",
  description,
  itemName,
  onConfirm,
  isLoading = false,
  variant = "default"
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description || `Tem certeza que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700" : "bg-[#355340] hover:bg-[#355340]/90"}
          >
            {isLoading ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}