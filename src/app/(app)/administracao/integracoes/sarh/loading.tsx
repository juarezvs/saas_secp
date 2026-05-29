export default function LoadingIntegracaoSarhPage() {
  return (
    <main className="space-y-6 p-6">
      <div className="h-8 w-80 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </main>
  );
}
