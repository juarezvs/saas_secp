import { Skeleton } from "@/components/ui/skeleton";

function LinhaSkeleton() {
  return (
    <tr className="border-b last:border-b-0">
      {Array.from({ length: 11 }).map((_, indice) => (
        <td key={indice} className="px-5 py-4">
          <Skeleton className={indice === 3 ? "h-12 w-56" : "h-4 w-full"} />
        </td>
      ))}
    </tr>
  );
}

export function ServidoresListagemSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-44" />

      <section className="space-y-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-[34rem] max-w-full" />
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="space-y-4 border-b p-5">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-[32rem] max-w-full" />
          <div className="grid gap-3 lg:grid-cols-6">
            {Array.from({ length: 10 }).map((_, indice) => (
              <div key={indice} className={indice === 0 ? "lg:col-span-2" : ""}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-10 w-full" />
              </div>
            ))}
            <div className="flex items-end">
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-center">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <tbody>
              {Array.from({ length: 8 }).map((_, indice) => (
                <LinhaSkeleton key={indice} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t p-5 md:flex-row md:items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
      </section>
    </div>
  );
}
