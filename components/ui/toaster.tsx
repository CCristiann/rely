"use client";

import { useToast } from "./use-toast";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 shadow-xl backdrop-blur-sm",
            "animate-fade-in",
            toast.variant === "destructive"
              ? "bg-destructive/10 border-destructive/30 text-foreground"
              : toast.variant === "success"
              ? "bg-success/10 border-success/30 text-foreground"
              : "bg-card border-border text-foreground"
          )}
        >
          <div className="shrink-0 mt-0.5">
            {toast.variant === "destructive" ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : toast.variant === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Info className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold leading-none mb-1">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-xs text-muted-foreground">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
