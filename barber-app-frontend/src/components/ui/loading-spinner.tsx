import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  className,
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}

export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

export function CardLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
      <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
      <div className="h-3 bg-muted rounded w-1/4 animate-pulse"></div>
    </div>
  );
}
