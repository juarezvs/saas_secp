import { Skeleton } from "@/components/ui";

export function DashboardServidorSkeleton() {
  return (
    <div className="space-y-5" aria-label="Carregando dashboard do servidor">
      <Skeleton className="h-16 w-full max-w-xl" />
      <div className="grid gap-4 xl:grid-cols-[2fr_repeat(4,1fr)]">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-44" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-80" />
        ))}
      </div>
    </div>
  );
}

