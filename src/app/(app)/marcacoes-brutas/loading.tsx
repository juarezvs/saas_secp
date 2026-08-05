function Linha() {
  return (
    <div className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-7">
      {Array.from({ length: 7 }).map((_, indice) => (
        <div key={indice} className="h-4 rounded bg-muted" />
      ))}
    </div>
  );
}

export default function MarcacoesBrutasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="rounded-xl border bg-card p-5">
        <div className="h-5 w-64 rounded bg-muted" />
        <div className="mt-3 h-4 w-[34rem] max-w-full rounded bg-muted" />
      </div>
      <div className="rounded-xl border bg-card p-5">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="mt-4 h-10 w-56 rounded bg-muted" />
      </div>
      <div className="flex gap-2 rounded-xl border bg-card p-2">
        <div className="h-10 w-44 rounded bg-muted" />
        <div className="h-10 w-44 rounded bg-muted" />
      </div>
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <div className="flex justify-between gap-4">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="h-10 w-80 rounded bg-muted" />
        </div>
        {Array.from({ length: 8 }).map((_, indice) => (
          <Linha key={indice} />
        ))}
      </section>
    </div>
  );
}
