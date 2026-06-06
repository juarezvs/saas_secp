import { CompetenciaInput } from "@/components/ui";

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
  servidorSelecionadoId,
  competencia,
}: {
  servidores: ServidorRelatorioItem[];
  servidorProprioId: string | null;
  podeConsultarGlobal: boolean;
  servidorSelecionadoId: string | null;
  competencia: string;
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Exportar relatórios do servidor</h2>

      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Gere PDFs de espelho de ponto e banco de horas por mês de referência.
      </p>

      <form
        className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end"
        action="/relatorios"
      >
        <div>
          <label
            htmlFor="relatorios-servidorId"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            Servidor
          </label>
          <select
            id="relatorios-servidorId"
            name="servidorId"
            defaultValue={servidorSelecionadoId ?? servidorProprioId ?? ""}
            disabled={!podeConsultarGlobal}
            className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
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
        </div>

        {!podeConsultarGlobal && servidorProprioId && (
          <input type="hidden" name="servidorId" value={servidorProprioId} />
        )}

        <CompetenciaInput defaultValue={competencia} />

        <button
          type="submit"
          className="h-10 rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)]"
        >
          Preparar links
        </button>
      </form>
    </section>
  );
}
