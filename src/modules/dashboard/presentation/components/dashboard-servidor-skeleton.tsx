import { Skeleton } from "@/components/ui";

export function DashboardServidorSkeleton() {
  return (
    <div className="space-y-5" aria-label="Carregando dashboard do servidor">
      <Skeleton className="h-16 w-full max-w-xl" />
      <div className="grid gap-3 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.65fr)]">
        <Skeleton className="h-44" />
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-20" />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.38fr]">
        <Skeleton className="h-64" />
        <div className="grid gap-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}

