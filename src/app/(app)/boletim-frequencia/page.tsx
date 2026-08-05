import Link from "next/link";
import { FileSpreadsheet, Eye } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { gerarBoletimFrequenciaAction } from "@/modules/boletim-frequencia/application/actions/gerar-boletim-frequencia.action";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import {
  listarBoletinsFrequenciaPaginado,
  listarFechamentosHomologadosSemBoletim,
  listarUnidadesBoletimFrequencia,
} from "@/modules/boletim-frequencia/infrastructure/repositories/boletim-frequencia.repository";
import {
  classeStatusBoletim,
  rotuloStatusBoletim,
} from "@/modules/boletim-frequencia/application/services/formatar-boletim-frequencia.service";
import { BoletinsListagemControles } from "@/modules/boletim-frequencia/presentation/components/boletins-listagem-controles";
import {
  calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario,
  classeSituacaoPrazoRegulatorio,
  descreverPrazoRegulatorio,
  formatarDataPrazoRegulatorio,
  rotuloSituacaoPrazoRegulatorio,
} from "@/modules/frequencia/application/services/prazo-regulatorio-frequencia.service";
import { auth } from "@/auth";

type BoletimFrequenciaPageProps = {
  searchParams?: Promise<{
    busca?: string;
    competencia?: string;
    anoReferencia?: string;
    mesReferencia?: string;
    unidade?: string;
    unidadeId?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

function normalizarCompetencia(params: {
  competencia?: string;
  anoReferencia?: string;
  mesReferencia?: string;
}) {
  const match = params.competencia?.match(/^(\d{4})-(\d{2})$/);
  const ano = match?.[1] ?? params.anoReferencia ?? "";
  const mes = match?.[2] ?? params.mesReferencia ?? "";

  return {
    anoReferencia: ano,
    mesReferencia: mes,
  };
}

function renderizarPrazoBoletim(
  prazo: Awaited<
    ReturnType<
      typeof calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario
    >
  >,
) {
  return (
    <div>
      <div className="font-semibold">
        {formatarDataPrazoRegulatorio(prazo.dataLimite)}
      </div>
      <span
        className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${classeSituacaoPrazoRegulatorio(
          prazo.situacao,
        )}`}
      >
        {rotuloSituacaoPrazoRegulatorio(prazo.situacao)}
      </span>
      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
        {descreverPrazoRegulatorio(prazo)}
      </div>
    </div>
  );
}

export default async function BoletimFrequenciaPage({
  searchParams,
}: BoletimFrequenciaPageProps) {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar([
    "boletim-frequencia:gerar:chefia",
    "boletim-frequencia:encaminhar:chefia",
    "boletim-frequencia:receber:global",
    "boletim-frequencia:consultar:global",
  ]);
  const podeGerar = usuarioPossuiPermissaoNoPerfil(
    acesso.perfilAtivoCodigo,
    acesso.permissoes,
    "boletim-frequencia:gerar:chefia",
  );
  const podeConsultarGlobal = acesso.permissoes.some((permissao) =>
    [
      "boletim-frequencia:receber:global",
      "boletim-frequencia:consultar:global",
    ].includes(permissao),
  );
  const session = await auth();

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);
  const competencia = normalizarCompetencia(params);

  const unidadeIdsPermitidos =
    !podeConsultarGlobal && session?.user
      ? await listarIdsUnidadesSubordinadasPorUsuario(session.user.id)
      : [];
  const unidadeIdsEscopo = podeConsultarGlobal
    ? undefined
    : unidadeIdsPermitidos;

  const [resultado, fechamentosDisponiveis, unidadesBoletim] =
    await Promise.all([
      listarBoletinsFrequenciaPaginado({
        busca: params.busca ?? "",
        anoReferencia: competencia.anoReferencia,
        mesReferencia: competencia.mesReferencia,
        unidade: params.unidade ?? "",
        unidadeId: params.unidadeId ?? "",
        unidadeIdsPermitidos: unidadeIdsEscopo,
        status: params.status ?? "",
        pagina,
        itensPorPagina,
      }),
      podeGerar
        ? listarFechamentosHomologadosSemBoletim({
            unidadeIdsPermitidos: unidadeIdsEscopo,
          })
        : Promise.resolve([]),
      listarUnidadesBoletimFrequencia({
        unidadeIdsPermitidos: unidadeIdsEscopo,
      }),
    ]);
  const prazosPorBoletim = new Map<
    string,
    Awaited<
      ReturnType<
        typeof calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario
      >
    >
  >();

  for (const boletim of resultado.boletins) {
    prazosPorBoletim.set(
      boletim.id,
      await calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario({
        anoReferencia: boletim.anoReferencia,
        mesReferencia: boletim.mesReferencia,
        concluidoEm: boletim.encaminhadoEm,
      }),
    );
  }

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "competencia",
    "unidadeId",
    "status",
  ] as const) {
    if (params[chave]) {
      exportParams.set(chave, params[chave]!);
    }
  }

  if (competencia.anoReferencia) {
    exportParams.set("anoReferencia", competencia.anoReferencia);
  }

  if (competencia.mesReferencia) {
    exportParams.set("mesReferencia", competencia.mesReferencia);
  }

  const baseParams = new URLSearchParams(exportParams);
  baseParams.set("itensPorPagina", String(resultado.itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/boletim-frequencia?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Boletim de Frequência" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Boletim de Frequência
        </p>

        <PageHeader
          icon={FileSpreadsheet}
          titulo="Boletins mensais"
          descricao="Gere, consulte e encaminhe à SECAP/NUCGP os boletins mensais de frequência das unidades homologadas."
          artigo="Arts. 16 e 17"
          regraTitulo="Boletim após homologação"
          regraDescricao="Após a homologação da frequência mensal, o boletim consolida as ocorrências e deve ser encaminhado à SECAP/NUCGP dentro do prazo regulamentar."
        />
      </section>

      <section className="grid gap-3 rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm md:grid-cols-3">
        <article className="rounded-lg border bg-[var(--muted)] p-4">
          <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
            1. Servidor
          </p>
          <h2 className="mt-2 font-bold">Apuração mensal</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Marcações, ocorrências e banco de horas compõem o espelho mensal.
          </p>
        </article>

        <article className="rounded-lg border bg-[var(--muted)] p-4">
          <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
            2. Chefia
          </p>
          <h2 className="mt-2 font-bold">Homologação e boletim</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            A unidade homologa o fechamento e gera o boletim consolidado.
          </p>
        </article>

        <article className="rounded-lg border bg-[var(--muted)] p-4">
          <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
            3. SECAP
          </p>
          <h2 className="mt-2 font-bold">Recebimento e conferência</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            A SECAP/NUCGP registra o recebimento e a conferência administrativa.
          </p>
        </article>
      </section>

      {podeGerar && (
        <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
          <h2 className="text-lg font-bold">
            Gerar boletim de fechamento homologado
          </h2>

          <form
            action={gerarBoletimFrequenciaAction}
            className="mt-4 space-y-4"
          >
            <select
              name="fechamentoId"
              defaultValue=""
              className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              required
            >
              <option value="">Selecione o fechamento homologado</option>

              {fechamentosDisponiveis.map((fechamento) => (
                <option key={fechamento.id} value={fechamento.id}>
                  {fechamento.unidade.sigla} -{" "}
                  {String(fechamento.mesReferencia).padStart(2, "0")}/
                  {fechamento.anoReferencia} - {fechamento.servidores.length}{" "}
                  servidores
                </option>
              ))}
            </select>

            <textarea
              name="observacao"
              rows={3}
              placeholder="Observação opcional para o boletim"
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
            />

            <button
              type="submit"
              className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Gerar boletim
            </button>
          </form>
        </section>
      )}

      <DataTableShell
        title="Boletins gerados"
        description="Use a pesquisa geral ou filtre por competência, unidade e status."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <BoletinsListagemControles
            exportCsvHref={`/api/boletim-frequencia/export?${exportParams.toString()}`}
            exportPdfHref={`/api/boletim-frequencia/export/pdf?${exportParams.toString()}`}
            unidades={unidadesBoletim.map((unidade) => ({
              value: unidade.id,
              label: `${unidade.unidadePai?.sigla ?? unidade.orgao.sigla} / ${unidade.sigla}`,
              searchText: [
                unidade.unidadePai?.sigla,
                unidade.sigla,
                unidade.nome,
                unidade.orgao.sigla,
                unidade.unidadePai?.nome,
              ]
                .filter(Boolean)
                .join(" "),
              grupo: unidade.unidadePai
                ? `${unidade.unidadePai.sigla} - ${unidade.unidadePai.nome}`
                : `${unidade.orgao.sigla} - unidades raiz`,
            }))}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Listagem de boletins de frequência com referência, unidade,
              servidores, status, processo SEI, responsável e ações.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Referência</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Prazo envio</th>
                <th className="px-5 py-3">Processo SEI</th>
                <th className="px-5 py-3">Gerado por</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.boletins.map((boletim) => (
                <tr key={boletim.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-semibold">
                    {String(boletim.mesReferencia).padStart(2, "0")}/
                    {boletim.anoReferencia}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{boletim.unidade.sigla}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {boletim.unidade.nome}
                    </div>
                  </td>
                  <td className="px-5 py-4">{boletim._count.servidores}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatusBoletim(
                        boletim.status,
                      )}`}
                    >
                      {rotuloStatusBoletim(boletim.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {renderizarPrazoBoletim(prazosPorBoletim.get(boletim.id)!)}
                  </td>
                  <td className="px-5 py-4">{boletim.processoSei ?? "-"}</td>
                  <td className="px-5 py-4">{boletim.geradoPor.nome}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/boletim-frequencia/${boletim.id}`}
                      className="inline-flex items-center justify-end gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {resultado.boletins.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum boletim encontrado para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
