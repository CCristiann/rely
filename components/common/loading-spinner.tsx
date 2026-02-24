import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-[1.5px]",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-2",
  };

  return (
    <div
      className={cn(
        "rounded-full border-border border-t-primary animate-spin",
        sizeClasses[size],
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full min-h-[200px]">
      <LoadingSpinner size="lg" />
    </div>
  );
}
