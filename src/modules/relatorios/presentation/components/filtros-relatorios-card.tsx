type ServidorRelatorioItem = {
  id: string;
  matricula: string;
  usuario: {
    nome: string;
  };
  lotacoes: {
    unidade: {
      sigla: string;
    };
  }[];
};

export function FiltrosRelatoriosCard({
  servidores,
  servidorProprioId,
  podeConsultarGlobal,
}: {
  servidores: ServidorRelatorioItem[];
  servidorProprioId: string | null;
  podeConsultarGlobal: boolean;
}) {
  const hoje = new Date();

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Exportar relatórios do servidor</h2>

      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Gere PDFs de espelho de ponto e banco de horas por mês de referência.
      </p>

      <form className="mt-5 grid gap-4 md:grid-cols-5" action="/relatorios">
        <select
          name="servidorId"
          defaultValue={servidorProprioId ?? ""}
          disabled={!podeConsultarGlobal}
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm md:col-span-2 disabled:opacity-80"
        >
          {servidores.map((servidor) => (
            <option key={servidor.id} value={servidor.id}>
              {servidor.matricula} — {servidor.usuario.nome}
              {servidor.lotacoes[0]
                ? ` (${servidor.lotacoes[0].unidade.sigla})`
                : ""}
            </option>
          ))}
        </select>

        {!podeConsultarGlobal && servidorProprioId && (
          <input type="hidden" name="servidorId" value={servidorProprioId} />
        )}

        <input
          type="number"
          name="ano"
          defaultValue={hoje.getFullYear()}
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
        />

        <input
          type="number"
          name="mes"
          min={1}
          max={12}
          defaultValue={hoje.getMonth() + 1}
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
        />

        <button
          type="submit"
          className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
        >
          Preparar links
        </button>
      </form>
    </section>
  );
}
