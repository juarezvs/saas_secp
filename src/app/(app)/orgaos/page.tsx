import { Landmark } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarOrgaosPaginado } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { OrgaosListagemControles } from "@/modules/orgaos/presentation/components/orgaos-listagem-controles";

type OrgaosPageProps = {
  searchParams?: Promise<{
    busca?: string;
    sigla?: string;
    nome?: string;
    codigoExternoSarh?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function OrgaosPage({ searchParams }: OrgaosPageProps) {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const resultado = await listarOrgaosPaginado({
    busca: params.busca ?? "",
    sigla: params.sigla ?? "",
    nome: params.nome ?? "",
    codigoExternoSarh: params.codigoExternoSarh ?? "",
    status: params.status ?? "",
    pagina,
    itensPorPagina,
  });

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "sigla",
    "nome",
    "codigoExternoSarh",
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
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
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
                <th className="px-5 py-3">Última sincronização</th>
                <th className="px-5 py-3">Status</th>
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
                </tr>
              ))}

              {resultado.orgaos.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
