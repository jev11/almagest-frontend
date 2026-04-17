import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-secondary", className)} />
  );
}

/** Placeholder for a chart wheel + planet list side by side */
export function ChartSkeleton({ compact = false }: { compact?: boolean }) {
  const wheelSize = compact ? "w-[120px] h-[120px]" : "w-[280px] h-[280px]";
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <Skeleton className={cn("rounded-full shrink-0", wheelSize)} />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        {Array.from({ length: compact ? 5 : 11 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-center py-1">
            <Skeleton className="w-5 h-4 rounded" />
            <Skeleton className="w-20 h-3 rounded" />
            <Skeleton className="w-16 h-3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder for a data table (planet/aspect/house) */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center py-1 border-b border-border last:border-0">
          <Skeleton className="w-5 h-4 rounded" />
          <Skeleton className="w-16 h-3 rounded" />
          <Skeleton className="flex-1 h-3 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a chart grid card */
export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center gap-3">
      <Skeleton className="w-[120px] h-[120px] rounded-full" />
      <Skeleton className="w-28 h-4 rounded" />
      <Skeleton className="w-16 h-3 rounded" />
      <Skeleton className="w-20 h-3 rounded" />
    </div>
  );
}

