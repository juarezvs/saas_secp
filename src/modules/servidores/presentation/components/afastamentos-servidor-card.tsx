import { CalendarX, FileText } from "lucide-react";
import { DataTablePagination } from "@/components/listagens/data-table-pagination";
import { AfastamentoTipoIcone } from "./afastamento-tipo-icone";
import { CopiarProcessoButton } from "./copiar-processo-button";

type AfastamentoItem = {
  id: string;
  categoria: string;
  tipoDescricao: string | null;
  dataInicio: Date;
  dataFim: Date | null;
  dias: number | null;
  processo: string | null;
  observacao: string | null;
  origemTabela: string;
  ativo: boolean;
  tipoAfastamento?: {
    descricao: string;
    categoria: string;
  } | null;
};

type AfastamentosServidorCardProps = {
  afastamentos: AfastamentoItem[];
  titulo?: string;
  descricao?: string;
  mostrarResumo?: boolean;
  resumo?: {
    total: number;
    vigentes: number;
    futuros: number;
  };
  paginacao?: {
    total: number;
    pagina: number;
    totalPaginas: number;
    itensPorPagina: number;
    montarHrefPagina: (pagina: number) => string;
  };
};

function formatarData(data: Date | null) {
  if (!data) return "Em aberto";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(data);
}

function normalizarData(data: Date) {
  const normalizada = new Date(data);
  normalizada.setHours(0, 0, 0, 0);
  return normalizada;
}

function obterStatus(afastamento: AfastamentoItem) {
  const hoje = normalizarData(new Date());
  const inicio = normalizarData(afastamento.dataInicio);
  const fim = afastamento.dataFim ? normalizarData(afastamento.dataFim) : null;

  if (!afastamento.ativo) {
    return {
      label: "Inativo",
      className:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  if (inicio > hoje) {
    return {
      label: "Futuro",
      className: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    };
  }

  if (!fim || fim >= hoje) {
    return {
      label: "Vigente",
      className:
        "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200",
    };
  }

  return {
    label: "Encerrado",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
}

function descricaoTipo(afastamento: AfastamentoItem) {
  return (
    afastamento.tipoDescricao ??
    afastamento.tipoAfastamento?.descricao ??
    afastamento.categoria
  );
}

export function AfastamentosServidorCard({
  afastamentos,
  titulo = "Afastamentos",
  descricao = "Licenças, férias e demais afastamentos importados do SARH.",
  mostrarResumo = true,
  resumo,
  paginacao,
}: AfastamentosServidorCardProps) {
  const total = resumo?.total ?? paginacao?.total ?? afastamentos.length;
  const vigentes =
    resumo?.vigentes ??
    afastamentos.filter(
      (afastamento) => obterStatus(afastamento).label === "Vigente",
    ).length;
  const futuros =
    resumo?.futuros ??
    afastamentos.filter(
      (afastamento) => obterStatus(afastamento).label === "Futuro",
    ).length;

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
            <CalendarX className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold">{titulo}</h2>
            {descricao && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {descricao}
              </p>
            )}
          </div>
        </div>

        {mostrarResumo && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Resumo label="Total" valor={total} />
            <Resumo label="Vigentes" valor={vigentes} />
            <Resumo label="Futuros" valor={futuros} />
          </div>
        )}
      </div>

      {afastamentos.length === 0 ? (
        <div className="p-8 text-center">
          <FileText
            className="mx-auto size-8 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-semibold">
            Nenhum afastamento encontrado
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Quando houver registros importados do SARH, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Dias</th>
                <th className="px-5 py-3">Processo</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {afastamentos.map((afastamento) => {
                const status = obterStatus(afastamento);
                const tipo = descricaoTipo(afastamento);

                return (
                  <tr key={afastamento.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
                          <AfastamentoTipoIcone descricao={tipo} />
                        </span>
                        <div>
                          <p className="font-semibold">{tipo}</p>
                          {afastamento.observacao && (
                            <p className="mt-1 max-w-sm truncate text-xs text-[var(--muted-foreground)]">
                              {afastamento.observacao}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                      {afastamento.categoria}
                    </td>
                    <td className="px-5 py-4">
                      {formatarData(afastamento.dataInicio)} até{" "}
                      {formatarData(afastamento.dataFim)}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {afastamento.dias ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      {afastamento.processo ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {afastamento.processo}
                          </span>
                          <CopiarProcessoButton
                            processo={afastamento.processo}
                          />
                        </span>
                      ) : (
                        <span className="font-mono text-xs">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paginacao && paginacao.total > 0 && (
        <div className="flex flex-col justify-between gap-3 border-t p-5 md:flex-row md:items-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            Página {paginacao.pagina} de {paginacao.totalPaginas}. Exibindo até{" "}
            {paginacao.itensPorPagina} registro(s) por página.
          </p>

          <DataTablePagination
            pagina={paginacao.pagina}
            totalPaginas={paginacao.totalPaginas}
            montarHrefPagina={paginacao.montarHrefPagina}
          />
        </div>
      )}
    </section>
  );
}

function Resumo({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-lg font-bold">{valor}</p>
      <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
    </div>
  );
}
