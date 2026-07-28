import Link from "next/link";
import {
  Check,
  Clock3,
  Eye,
  FileCheck2,
  FileClock,
  FileX2,
  Filter,
  Search,
  type LucideIcon,
} from "lucide-react";
import {
  DataTablePageSize,
  DataTablePagination,
} from "@/components/listagens";
import {
  classeStatusSolicitacao,
  rotuloStatusSolicitacao,
  rotuloTipoSolicitacao,
} from "../../application/services/fluxo-solicitacao.service";
import { dataPeriodoSolicitacaoParaExibicao } from "../../application/services/periodo-solicitacao.service";
import { resolverFusoHorarioUnidade } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type SolicitacaoItem = {
  id: string;
  tipo: string;
  status: string;
  titulo: string;
  criadoEm: Date;
  dataReferencia: Date | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  servidor: {
    matricula: string;
    nomeFuncional?: string | null;
    usuario: {
      nome: string;
    };
  };
  unidade: {
    sigla: string;
    codigo?: string | null;
    nome?: string | null;
    fusoHorario?: string | null;
  } | null;
};

type ServidorFiltroItem = {
  id: string;
  matricula: string;
  nomeFuncional?: string | null;
  usuario: {
    nome: string;
  };
};

const tiposSolicitacao = [
  "AJUSTE_PONTO",
  "COMPENSACAO",
  "ABONO_JUSTIFICATIVA",
  "ATIVIDADE_EXTERNA",
  "VIAGEM_SERVICO",
  "CAPACITACAO",
  "DISPENSA_PONTO",
  "HORA_CREDITO_PREVIA",
  "FOLGA_BANCO_HORAS",
];

function formatarData(data: Date | null, fusoHorario?: string | null) {
  if (!data) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoHorario ?? "UTC",
  }).format(data);
}

function formatarPeriodo(solicitacao: SolicitacaoItem) {
  if (solicitacao.dataReferencia) {
    return formatarData(solicitacao.dataReferencia);
  }

  const fusoHorario = resolverFusoHorarioUnidade(solicitacao.unidade);
  const inicio = formatarData(
    dataPeriodoSolicitacaoParaExibicao(
      solicitacao.tipo,
      solicitacao.dataInicio,
      "inicio",
    ),
    fusoHorario,
  );
  const fim = formatarData(
    dataPeriodoSolicitacaoParaExibicao(
      solicitacao.tipo,
      solicitacao.dataFim,
      "fim",
    ),
    fusoHorario,
  );

  if (inicio && fim) {
    return inicio === fim ? inicio : `${inicio} a ${fim}`;
  }

  return inicio ?? "-";
}

function contarStatus(solicitacoes: SolicitacaoItem[]) {
  return solicitacoes.reduce(
    (acc, solicitacao) => {
      if (["ENVIADA", "EM_ANALISE"].includes(solicitacao.status)) {
        acc.pendentes += 1;
      } else if (solicitacao.status === "DEFERIDA") {
        acc.deferidas += 1;
      } else if (solicitacao.status === "INDEFERIDA") {
        acc.indeferidas += 1;
      }

      return acc;
    },
    {
      pendentes: 0,
      deferidas: 0,
      indeferidas: 0,
    },
  );
}

function contarPorTipo(solicitacoes: SolicitacaoItem[]) {
  return solicitacoes.reduce((acc, solicitacao) => {
    acc.set(solicitacao.tipo, (acc.get(solicitacao.tipo) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
}

function ResumoItem({
  icon: Icon,
  label,
  valor,
}: {
  icon: LucideIcon;
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-lg border bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold">{valor}</p>
    </div>
  );
}

export function SolicitacoesTable({
  solicitacoes,
  tipoSelecionado,
  servidorFiltro,
  servidoresFiltro,
  mostrarFiltroServidor,
  paginacao,
}: {
  solicitacoes: SolicitacaoItem[];
  tipoSelecionado?: string;
  servidorFiltro?: string;
  servidoresFiltro?: ServidorFiltroItem[];
  mostrarFiltroServidor?: boolean;
  paginacao?: {
    total: number;
    pagina: number;
    totalPaginas: number;
    itensPorPagina: number;
    montarHrefPagina: (pagina: number) => string;
  };
}) {
  const servidorAtivo = servidorFiltro?.trim() || "";
  const tipoAtivo = tipoSelecionado?.trim() || undefined;
  const resumo = contarStatus(solicitacoes);
  const contagemPorTipo = contarPorTipo(solicitacoes);
  const tipos = tiposSolicitacao.sort((a, b) =>
    rotuloTipoSolicitacao(a).localeCompare(rotuloTipoSolicitacao(b), "pt-BR"),
  );
  const exibirFiltroServidor = mostrarFiltroServidor !== false;
  const paramsTodosTipos = new URLSearchParams();

  if (servidorAtivo && exibirFiltroServidor) {
    paramsTodosTipos.set("servidor", servidorAtivo);
  }

  if (paginacao?.itensPorPagina) {
    paramsTodosTipos.set("itensPorPagina", String(paginacao.itensPorPagina));
  }

  paramsTodosTipos.set("pagina", "1");

  const hrefTodosTipos = `/solicitacoes?${paramsTodosTipos.toString()}`;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <ResumoItem
          icon={Clock3}
          label="Total"
          valor={paginacao?.total ?? solicitacoes.length}
        />
        <ResumoItem
          icon={FileClock}
          label="Pendentes"
          valor={resumo.pendentes}
        />
        <ResumoItem
          icon={FileCheck2}
          label="Deferidas"
          valor={resumo.deferidas}
        />
        <ResumoItem
          icon={FileX2}
          label="Indeferidas"
          valor={resumo.indeferidas}
        />
      </div>

      <div className="rounded-lg border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Solicitações registradas</h2>
            {tipoAtivo ? (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Filtrando por {rotuloTipoSolicitacao(tipoAtivo)}
                {servidorAtivo && exibirFiltroServidor
                  ? ` e servidor: ${servidorAtivo}`
                  : ""}
              </p>
            ) : servidorAtivo && exibirFiltroServidor ? (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Filtrando por servidor: {servidorAtivo}.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            {exibirFiltroServidor ? (
              <form
                className="flex flex-col gap-2 sm:flex-row"
                action="/solicitacoes"
              >
                {tipoAtivo ? (
                  <input type="hidden" name="tipo" value={tipoAtivo} />
                ) : null}
                {paginacao?.itensPorPagina ? (
                  <input
                    type="hidden"
                    name="itensPorPagina"
                    value={paginacao.itensPorPagina}
                  />
                ) : null}
                <input type="hidden" name="pagina" value="1" />
                <label className="sr-only" htmlFor="servidor">
                  Filtrar por servidor
                </label>
                <input
                  id="servidor"
                  name="servidor"
                  list="solicitacoes-servidores"
                  defaultValue={servidorAtivo}
                  placeholder="Pesquise por nome ou matrícula"
                  className="h-10 w-full min-w-[300px] rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
                <datalist id="solicitacoes-servidores">
                  {(servidoresFiltro ?? []).map((servidor) => {
                    const nome = nomeServidor(servidor);

                    return (
                      <option
                        key={servidor.id}
                        value={`${servidor.matricula} - ${nome}`}
                      />
                    );
                  })}
                </datalist>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950"
                >
                  <Search className="size-4" aria-hidden="true" />
                  Filtrar
                </button>
              </form>
            ) : null}

            <details className="relative self-start md:self-end">
              <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)] [&::-webkit-details-marker]:hidden">
                <Filter className="size-4" aria-hidden="true" />
                Filtrar tipo
              </summary>

              <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-[var(--card)] p-2 shadow-lg">
                <Link
                  href={hrefTodosTipos}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
                >
                  <span>Todos os tipos</span>
                  {!tipoAtivo ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : null}
                </Link>

                {tipos.map((tipo) => {
                  const ativo = tipoAtivo === tipo;
                  const query = new URLSearchParams({ tipo });

                  if (servidorAtivo && exibirFiltroServidor) {
                    query.set("servidor", servidorAtivo);
                  }
                  if (paginacao?.itensPorPagina) {
                    query.set(
                      "itensPorPagina",
                      String(paginacao.itensPorPagina),
                    );
                  }
                  query.set("pagina", "1");

                  return (
                    <Link
                      key={tipo}
                      href={`/solicitacoes?${query.toString()}`}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-[var(--muted)]"
                    >
                      <span>{rotuloTipoSolicitacao(tipo)}</span>
                      <span className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
                        {contagemPorTipo.get(tipo) ?? 0}
                        {ativo ? (
                          <Check className="size-4" aria-hidden="true" />
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </details>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Criada em</th>
                <th className="px-5 py-3">Referência</th>
                <th className="px-5 py-3">Servidor</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Título</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {solicitacoes.map((solicitacao) => (
                <tr key={solicitacao.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    {new Intl.DateTimeFormat("pt-BR").format(
                      solicitacao.criadoEm,
                    )}
                  </td>

                  <td className="px-5 py-4 font-medium">
                    {formatarPeriodo(solicitacao)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {nomeServidor(solicitacao.servidor)}
                    </div>
                    <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                      {solicitacao.servidor.matricula}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {solicitacao.unidade?.sigla ?? "-"}
                  </td>

                  <td className="px-5 py-4">
                    {rotuloTipoSolicitacao(solicitacao.tipo)}
                  </td>

                  <td className="px-5 py-4">
                    <span className="line-clamp-2">{solicitacao.titulo}</span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatusSolicitacao(
                        solicitacao.status,
                      )}`}
                    >
                      {rotuloStatusSolicitacao(solicitacao.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/solicitacoes/${solicitacao.id}`}
                      className="inline-flex items-center justify-end gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-[var(--muted)] dark:text-blue-300"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {solicitacoes.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginacao ? (
          <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              {paginacao.total} registro(s) encontrado(s)
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <DataTablePageSize value={paginacao.itensPorPagina} />
              <DataTablePagination
                pagina={paginacao.pagina}
                totalPaginas={paginacao.totalPaginas}
                montarHrefPagina={paginacao.montarHrefPagina}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
