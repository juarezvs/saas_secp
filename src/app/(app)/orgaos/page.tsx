import Link from "next/link";
import { Edit, Landmark, Plus } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarFusosHorariosAtivos } from "@/modules/fusos-horarios/infrastructure/repositories/fuso-horario.repository";
import { listarOrgaosPaginado } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { OrgaosListagemControles } from "@/modules/orgaos/presentation/components/orgaos-listagem-controles";

type OrgaosPageProps = {
  searchParams?: Promise<{
    busca?: string;
    sigla?: string;
    nome?: string;
    codigoExternoSarh?: string;
    status?: string;
    fusoHorario?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function OrgaosPage({ searchParams }: OrgaosPageProps) {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const [resultado, fusosHorarios] = await Promise.all([
    listarOrgaosPaginado(
      aplicarEscopoOrgaoId(
        {
          busca: params.busca ?? "",
          sigla: params.sigla ?? "",
          nome: params.nome ?? "",
          codigoExternoSarh: params.codigoExternoSarh ?? "",
          status: params.status ?? "",
          fusoHorario: params.fusoHorario ?? "",
          pagina,
          itensPorPagina,
        },
        escopoOrgao,
      ),
    ),
    listarFusosHorariosAtivos(),
  ]);

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "sigla",
    "nome",
    "codigoExternoSarh",
    "status",
    "fusoHorario",
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
    return `/orgaos?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Órgãos" },
        ]}
      />

      <PageHeader
        icon={Landmark}
        titulo="Órgãos"
        descricao="Consulte os órgãos institucionais usados como base para unidades, servidores, lotações e integracao SARH."
        artigo="Arts. 1, 3 e 20"
        regraTitulo="Abrangência institucional"
        regraDescricao="A estrutura de órgãos organiza a abrangência administrativa do SECP e sustenta cadastros funcionais, unidades organizacionais e sincronizações externas."
      />

      {escopoOrgao.global && (
        <div className="flex justify-end">
          <Link
            href="/orgaos/novo"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            <Plus className="size-4" aria-hidden="true" />
            Novo orgao
          </Link>
        </div>
      )}

      <DataTableShell
        title="Órgãos cadastrados"
        description="Use a pesquisa geral ou filtre por sigla, nome, código SARH e status."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <OrgaosListagemControles
            exportCsvHref={`/api/orgaos/export?${exportParams.toString()}`}
            exportPdfHref={`/api/orgaos/export/pdf?${exportParams.toString()}`}
            fusosHorarios={fusosHorarios}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Listagem de órgãos com sigla, nome, código SARH, unidades,
              servidores, status e datas de sincronização.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Sigla</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Código SARH</th>
                <th className="px-5 py-3">Unidades</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3">Fuso</th>
                <th className="px-5 py-3">Última sincronização</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.orgaos.map((orgao) => (
                <tr key={orgao.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {orgao.sigla}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{orgao.nome}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {orgao.codigoExternoSarh ?? "-"}
                  </td>
                  <td className="px-5 py-4">{orgao._count.unidades}</td>
                  <td className="px-5 py-4">{orgao._count.servidores}</td>
                  <td className="px-5 py-4">{orgao.fusoHorario ?? "-"}</td>
                  <td className="px-5 py-4">
                    {orgao.ultimaSincronizacaoSarh
                      ? new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(orgao.ultimaSincronizacaoSarh)
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        orgao.ativo
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {orgao.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/orgaos/${orgao.id}/editar`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      <Edit className="size-4" aria-hidden="true" />
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}

              {resultado.orgaos.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum órgão encontrado para os filtros informados.
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
