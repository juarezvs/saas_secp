import { CompetenciaInput, SearchableSelect } from "@/components/ui";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type ServidorRelatorioItem = {
  id: string;
  matricula: string;
  nomeFuncional?: string | null;
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
  podeSelecionarServidor,
  servidorSelecionadoId,
  competencia,
}: {
  servidores: ServidorRelatorioItem[];
  servidorProprioId: string | null;
  podeSelecionarServidor: boolean;
  servidorSelecionadoId: string | null;
  competencia: string;
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Filtros dos relatorios</h2>

      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Escolha a competencia e, quando necessario, restrinja a emissao a um
        servidor.
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
          <SearchableSelect
            id="relatorios-servidorId"
            name="servidorId"
            defaultValue={servidorSelecionadoId ?? ""}
            disabled={!podeSelecionarServidor}
            className="mt-2"
            searchPlaceholder="Pesquisar por matricula, nome ou lotacao..."
            options={[
              ...(podeSelecionarServidor
                ? [{ value: "", label: "Todos no escopo permitido" }]
                : []),
              ...servidores.map((servidor) => ({
                value: servidor.id,
                label: `${servidor.matricula} - ${nomeServidor(servidor)}${
                  servidor.lotacoes[0]
                    ? ` (${servidor.lotacoes[0].unidade.sigla})`
                    : ""
                }`,
              })),
            ]}
          />
        </div>

        {!podeSelecionarServidor && servidorProprioId && (
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
