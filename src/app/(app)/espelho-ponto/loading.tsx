export default function EspelhoPontoLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="rounded-xl border bg-card p-5">
        <div className="h-6 w-52 rounded bg-muted" />
        <div className="mt-3 h-4 w-[40rem] max-w-full rounded bg-muted" />
      </div>
      <div className="rounded-xl border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-end">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-10 rounded-md bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-10 rounded-md bg-muted" />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="h-10 w-56 rounded-md bg-muted" />
          <div className="h-12 w-full max-w-xl rounded-md bg-muted" />
        </div>
        <div className="mt-4 flex justify-end border-t pt-4">
          <div className="h-10 w-32 rounded-md bg-muted" />
        </div>
      </div>
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, indice) => (
            <div key={indice} className="h-20 rounded-md bg-muted" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, indice) => (
            <div key={indice} className="h-12 rounded-md border bg-card" />
          ))}
        </div>
      </section>
    </div>
  );
}
