import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /** Use "inline" for small in-page errors, "page" for full-height route errors */
  variant?: "inline" | "page";
}

export function ErrorCard({
  message = "Something went wrong.",
  onRetry,
  retryLabel = "Retry",
  className,
  variant = "inline",
}: ErrorCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center",
        variant === "page" && "justify-center min-h-[200px]",
        className,
      )}
    >
      <AlertCircle className="text-destructive shrink-0" size={20} />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
