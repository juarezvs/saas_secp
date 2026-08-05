import Link from "next/link";
import { ShieldCheck, Eye } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarFechamentosMensaisPaginado } from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import { rotuloStatusFechamento } from "@/modules/homologacao/application/services/formatar-homologacao.service";
import { HomologacaoListagemControles } from "@/modules/homologacao/presentation/components/homologacao-listagem-controles";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import {
  calcularPrazoHomologacaoCompetenciaComCalendario,
  classeSituacaoPrazoRegulatorio,
  descreverPrazoRegulatorio,
  formatarDataPrazoRegulatorio,
  rotuloSituacaoPrazoRegulatorio,
} from "@/modules/frequencia/application/services/prazo-regulatorio-frequencia.service";
import { buscarRegulamentacaoPontoOrgao } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";

type HomologacaoPageProps = {
  searchParams?: Promise<{
    busca?: string;
    competencia?: string;
    anoReferencia?: string;
    mesReferencia?: string;
    unidade?: string;
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

function classeStatusFechamento(status: string) {
  if (["HOMOLOGADO", "HOMOLOGADO_PARCIAL"].includes(status)) {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
  }

  if (status === "EM_HOMOLOGACAO") {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
  }

  if (status === "CANCELADO") {
    return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function renderizarPrazoHomologacao(
  prazo: Awaited<
    ReturnType<typeof calcularPrazoHomologacaoCompetenciaComCalendario>
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

export default async function HomologacaoPage({
  searchParams,
}: HomologacaoPageProps) {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar([
    "homologacao:gerenciar:chefia",
    "homologacao:consultar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);
  const competencia = normalizarCompetencia(params);
  const podeConsultarGlobal = acesso.permissoes.includes(
    "homologacao:consultar:global",
  );
  const unidadeIdsPermitidos =
    !podeConsultarGlobal && acesso.usuarioId
      ? await listarIdsUnidadesSubordinadasPorUsuario(acesso.usuarioId)
      : undefined;

  const resultado = await listarFechamentosMensaisPaginado({
    busca: params.busca ?? "",
    anoReferencia: competencia.anoReferencia,
    mesReferencia: competencia.mesReferencia,
    unidade: params.unidade ?? "",
    unidadeIdsPermitidos,
    status: params.status ?? "",
    pagina,
    itensPorPagina,
  });
  const prazosPorFechamento = new Map<
    string,
    Awaited<ReturnType<typeof calcularPrazoHomologacaoCompetenciaComCalendario>>
  >();

  for (const fechamento of resultado.fechamentos) {
    const regulamentacao = await buscarRegulamentacaoPontoOrgao(
      fechamento.unidade.orgaoId,
    );
    prazosPorFechamento.set(
      fechamento.id,
      await calcularPrazoHomologacaoCompetenciaComCalendario({
        anoReferencia: fechamento.anoReferencia,
        mesReferencia: fechamento.mesReferencia,
        concluidoEm: fechamento.homologadoEm,
        diaLimiteMesSeguinte: regulamentacao.prazoHomologacaoDiaMesSeguinte,
      }),
    );
  }

  const exportParams = new URLSearchParams();

  for (const chave of ["busca", "competencia", "unidade", "status"] as const) {
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
    return `/homologacao?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Homologação" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Homologação mensal
        </p>

        <PageHeader
          icon={ShieldCheck}
          titulo="Fechamentos mensais"
          descricao="Acompanhe fechamentos de frequência por unidade, competência, status e servidores vinculados."
          artigo="Art. 16"
          regraTitulo="Prazo de homologação"
          regraDescricao="A chefia deve homologar mensalmente a frequência ate o segundo dia util do mês subsequente, permitindo a consolidacao do boletim de frequência."
        />
      </section>

      <DataTableShell
        title="Fechamentos para homologação"
        description="Use a pesquisa geral ou filtre por competência, unidade e status."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <HomologacaoListagemControles
            exportCsvHref={`/api/homologacao/export?${exportParams.toString()}`}
            exportPdfHref={`/api/homologacao/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Listagem de fechamentos mensais com competência, unidade,
              servidores, status, responsáveis e ações.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Referência</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Prazo</th>
                <th className="px-5 py-3">Aberto por</th>
                <th className="px-5 py-3">Homologado por</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.fechamentos.map((fechamento) => (
                <tr key={fechamento.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-semibold">
                    {String(fechamento.mesReferencia).padStart(2, "0")}/
                    {fechamento.anoReferencia}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {fechamento.unidade.sigla}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {fechamento.unidade.nome}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {fechamento.totalServidores}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {fechamento.totalHomologados +
                        fechamento.totalHomologadosComRessalva}{" "}
                      homologado(s)
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatusFechamento(
                        fechamento.status,
                      )}`}
                    >
                      {rotuloStatusFechamento(fechamento.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {renderizarPrazoHomologacao(
                      prazosPorFechamento.get(fechamento.id)!,
                    )}
                  </td>
                  <td className="px-5 py-4">{fechamento.abertoPor.nome}</td>
                  <td className="px-5 py-4">
                    {fechamento.homologadoPor?.nome || "-"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/homologacao/${fechamento.id}`}
                      className="inline-flex items-center justify-end gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {resultado.fechamentos.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum fechamento encontrado para os filtros informados.
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
