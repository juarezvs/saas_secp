export default function MinhaEquipeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-36 rounded bg-muted" />
      <div className="rounded-xl border bg-card p-5">
        <div className="h-6 w-44 rounded bg-muted" />
        <div className="mt-3 h-4 w-[42rem] max-w-full rounded bg-muted" />
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_160px]">
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, indice) => (
          <div key={indice} className="h-24 rounded-md border bg-card p-4">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-4 h-8 w-16 rounded bg-muted" />
          </div>
        ))}
      </section>
      <div className="h-80 rounded-xl border bg-card" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, indice) => (
          <div key={indice} className="h-32 rounded-md border bg-card" />
        ))}
      </div>
    </div>
  );
}
