function Linha({ colunas = 6 }: { colunas?: number }) {
  return (
    <div className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-6">
      {Array.from({ length: colunas }).map((_, indice) => (
        <div key={indice} className="h-4 rounded bg-muted" />
      ))}
    </div>
  );
}

export default function MarcacoesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="rounded-xl border bg-card p-5">
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-muted" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, indice) => (
          <div key={indice} className="h-24 rounded-xl border bg-card p-4">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-4 h-7 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <div className="flex justify-between gap-4">
          <div className="h-5 w-56 rounded bg-muted" />
          <div className="h-10 w-72 rounded bg-muted" />
        </div>
        {Array.from({ length: 5 }).map((_, indice) => (
          <Linha key={indice} />
        ))}
      </section>
    </div>
  );
}
