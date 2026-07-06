export default function MeusAfastamentosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-44 rounded bg-muted" />
      <div className="rounded-xl border bg-card p-5">
        <div className="h-6 w-56 rounded bg-muted" />
        <div className="mt-3 h-4 w-[36rem] max-w-full rounded bg-muted" />
      </div>
      <div className="flex gap-2 rounded-xl border bg-card p-2">
        <div className="h-10 w-32 rounded bg-muted" />
        <div className="h-10 w-48 rounded bg-muted" />
      </div>
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, indice) => (
            <div key={indice} className="h-20 rounded-md bg-muted" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, indice) => (
          <div key={indice} className="h-16 rounded-md border bg-card" />
        ))}
      </section>
    </div>
  );
}
