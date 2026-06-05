import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarFechamentosMensaisPaginado,
} from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import {
  rotuloStatusFechamento,
} from "@/modules/homologacao/application/services/formatar-homologacao.service";
import { HomologacaoListagemControles } from "@/modules/homologacao/presentation/components/homologacao-listagem-controles";

type HomologacaoPageProps = {
  searchParams?: Promise<{
    busca?: string;
    anoReferencia?: string;
    mesReferencia?: string;
    unidade?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

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

export default async function HomologacaoPage({
  searchParams,
}: HomologacaoPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "homologacao:gerenciar:chefia",
    "homologacao:consultar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const resultado = await listarFechamentosMensaisPaginado({
    busca: params.busca ?? "",
    anoReferencia: params.anoReferencia ?? "",
    mesReferencia: params.mesReferencia ?? "",
    unidade: params.unidade ?? "",
    status: params.status ?? "",
    pagina,
    itensPorPagina,
  });

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "anoReferencia",
    "mesReferencia",
    "unidade",
    "status",
  ] as const) {
    if (params[chave]) {
      exportParams.set(chave, params[chave]!);
    }
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
      <Breadcrumb items={[{ label: "Homologacao" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Homologacao mensal
        </p>

        <PageHeader
          icon={ClipboardCheck}
          titulo="Fechamentos mensais"
          descricao="Acompanhe fechamentos de frequencia por unidade, competencia, status e servidores vinculados."
          artigo="Art. 16"
          regraTitulo="Prazo de homologacao"
          regraDescricao="A chefia deve homologar mensalmente a frequencia ate o segundo dia util do mes subsequente, permitindo a consolidacao do boletim de frequencia."
        />
      </section>

      <DataTableShell
        title="Fechamentos para homologacao"
        description="Use a pesquisa geral ou filtre por competencia, unidade e status."
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
              Listagem de fechamentos mensais com competencia, unidade,
              servidores, status, responsaveis e acoes.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Referencia</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Aberto por</th>
                <th className="px-5 py-3">Homologado por</th>
                <th className="px-5 py-3 text-right">Acoes</th>
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
                  <td className="px-5 py-4">{fechamento.servidores.length}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatusFechamento(
                        fechamento.status,
                      )}`}
                    >
                      {rotuloStatusFechamento(fechamento.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4">{fechamento.abertoPor.nome}</td>
                  <td className="px-5 py-4">
                    {fechamento.homologadoPor?.nome ?? "-"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/homologacao/${fechamento.id}`}
                      className="text-sm font-semibold text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {resultado.fechamentos.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
