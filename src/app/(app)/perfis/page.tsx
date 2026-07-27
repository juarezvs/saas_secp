import Link from "next/link";
import { Plus, ShieldAlert, Eye } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarPerfisParaFiltro,
  listarPerfisPaginado,
  listarPermissoesParaFiltro,
} from "@/modules/perfis/infrastructure/repositories/perfil.repository";
import { PerfisListagemControles } from "@/modules/perfis/presentation/components/perfis-listagem-controles";

type PerfisPageProps = {
  searchParams?: Promise<{
    busca?: string;
    codigo?: string;
    nome?: string;
    permissao?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function PerfisPage({ searchParams }: PerfisPageProps) {
  await exigirPermissaoOuRedirecionar("perfis:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;
  const [resultado, perfisFiltro, permissoesFiltro] = await Promise.all([
    listarPerfisPaginado({
      busca: params.busca ?? "",
      codigo: params.codigo ?? "",
      nome: params.nome ?? "",
      permissao: params.permissao ?? "",
      status: params.status ?? "",
      orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
      pagina,
      itensPorPagina,
    }),
    listarPerfisParaFiltro({ orgaoIdsPermitidos }),
    listarPermissoesParaFiltro(),
  ]);
  const perfisOptions = perfisFiltro.map((perfil) => ({
    value: perfil.nome,
    label: `${perfil.nome} (${perfil.codigo})`,
    searchText: perfil.codigo,
  }));
  const permissoesOptions = permissoesFiltro.map((permissao) => ({
    value: permissao.codigo,
    label: permissao.codigo,
    searchText: `${permissao.recurso} ${permissao.acao} ${permissao.escopo} ${
      permissao.descricao ?? ""
    }`,
  }));

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "codigo",
    "nome",
    "permissao",
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
    return `/perfis?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Perfis e permissões" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Controle de acesso
          </p>

          <PageHeader
            icon={ShieldAlert}
            titulo="Perfis e permissões"
            descricao="Gerencie perfis de acesso, permissões e escopos de atuação dos usuários do SECP."
            artigo="Art. 2, inciso XII; Arts. 16 e 20"
            regraTitulo="Ações gerenciais e responsabilidades"
            regraDescricao="O controle de acesso por perfis garante que chefias, delegados, administradores, SECAP, SECAD, DIREF e NUTEC executem apenas ações compatíveis com suas responsabilidades institucionais."
          />
        </div>

        <Link
          href="/perfis/novo"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo perfil
        </Link>
      </section>

      <DataTableShell
        title="Perfis cadastrados"
        description="Use a pesquisa geral ou filtre por código, nome, permissão e status."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <PerfisListagemControles
            perfis={perfisOptions}
            permissoes={permissoesOptions}
            exportCsvHref={`/api/perfis/export?${exportParams.toString()}`}
            exportPdfHref={`/api/perfis/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">
              Listagem de perfis com código, nome, usuários, permissões, status
              e ações.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Usuários</th>
                <th className="px-5 py-3">Permissões</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.perfis.map((perfil) => (
                <tr key={perfil.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {perfil.codigo}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold">{perfil.nome}</div>
                    {perfil.descricao && (
                      <div className="mt-1 max-w-xl text-xs leading-5 text-[var(--muted-foreground)]">
                        {perfil.descricao}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4">{perfil._count.usuarios}</td>
                  <td className="px-5 py-4">{perfil.permissoes.length}</td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        perfil.ativo
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {perfil.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/perfis/${perfil.id}`}
                      className="inline-flex items-center justify-end gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {resultado.perfis.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum perfil encontrado para os filtros informados.
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
