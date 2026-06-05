import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { listarUnidadesOrganizacionaisPaginado } from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { UnidadesListagemControles } from "@/modules/unidades/presentation/components/unidades-listagem-controles";

type UnidadesPageProps = {
  searchParams?: Promise<{
    busca?: string;
    sigla?: string;
    nome?: string;
    tipo?: string;
    orgaoId?: string;
    superior?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function UnidadesPage({
  searchParams,
}: UnidadesPageProps) {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const params = searchParams ? await searchParams : {};

  const [orgaos, resultado] = await Promise.all([
    listarOrgaosAtivos(),
    listarUnidadesOrganizacionaisPaginado({
      busca: params.busca ?? "",
      sigla: params.sigla ?? "",
      nome: params.nome ?? "",
      tipo: params.tipo ?? "",
      orgaoId: params.orgaoId ?? "",
      superior: params.superior ?? "",
      status: params.status ?? "",
      pagina: Number(params.pagina ?? 1),
      itensPorPagina: Number(params.itensPorPagina ?? 10),
    }),
  ]);

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "sigla",
    "nome",
    "tipo",
    "orgaoId",
    "superior",
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
    return `/unidades?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Unidades" },
        ]}
      />

      <PageHeader
        icon={Building2}
        titulo="Unidades organizacionais"
        descricao="Cadastre e mantenha a estrutura organizacional usada para lotacao, chefia, homologacao, relatorios e controle de frequencia."
        artigo="Arts. 1, 3, 16 e 20"
        regraTitulo="Abrangencia institucional e gestao da frequencia"
        regraDescricao="A estrutura de unidades permite controlar frequencia, homologacoes, boletins e responsabilidades gerenciais dentro da Secao Judiciaria do Amazonas, subsecoes e unidades vinculadas."
        actions={
          <Link
            href="/unidades/nova"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nova unidade
          </Link>
        }
      />

      <DataTableShell
        title="Unidades cadastradas"
        description="Use a pesquisa geral ou filtre diretamente pelas colunas da tabela."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <UnidadesListagemControles
            orgaos={orgaos}
            exportCsvHref={`/api/unidades/export?${exportParams.toString()}`}
            exportPdfHref={`/api/unidades/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Listagem de unidades com sigla, nome, tipo, orgao, unidade
              superior, contadores, status e acoes.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Sigla</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Orgao</th>
                <th className="px-5 py-3">Superior</th>
                <th className="px-5 py-3">Subunidades</th>
                <th className="px-5 py-3">Lotados</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Acoes</th>
              </tr>
            </thead>

            <tbody>
              {resultado.unidades.map((unidade) => (
                <tr key={unidade.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {unidade.sigla}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{unidade.nome}</div>
                    <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                      {unidade.codigo}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                    {unidade.tipo}
                  </td>
                  <td className="px-5 py-4">{unidade.orgao.sigla}</td>
                  <td className="px-5 py-4">
                    {unidade.unidadePai ? unidade.unidadePai.sigla : "-"}
                  </td>
                  <td className="px-5 py-4">{unidade._count.unidadesFilhas}</td>
                  <td className="px-5 py-4">{unidade._count.lotacoes}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        unidade.ativo
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {unidade.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/unidades/${unidade.id}`}
                      className="text-sm font-semibold text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {resultado.unidades.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma unidade encontrada para os filtros informados.
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
