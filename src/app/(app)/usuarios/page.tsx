import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarUsuariosPaginado } from "@/modules/usuarios/infrastructure/repositories/usuario.repository";
import { UsuariosListagemControles } from "@/modules/usuarios/presentation/components/usuarios-listagem-controles";

type UsuariosPageProps = {
  searchParams?: Promise<{
    busca?: string;
    matricula?: string;
    nome?: string;
    email?: string;
    tipo?: string;
    lotacao?: string;
    perfil?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  await exigirPermissaoOuRedirecionar("usuarios:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const resultado = await listarUsuariosPaginado({
    busca: params.busca ?? "",
    matricula: params.matricula ?? "",
    nome: params.nome ?? "",
    email: params.email ?? "",
    tipo: params.tipo ?? "",
    lotacao: params.lotacao ?? "",
    perfil: params.perfil ?? "",
    status: params.status ?? "",
    pagina,
    itensPorPagina,
  });

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "matricula",
    "nome",
    "email",
    "tipo",
    "lotacao",
    "perfil",
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
    return `/usuarios?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Usuarios" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Administracao de acessos
          </p>

          <PageHeader
            icon={UsersRound}
            titulo="Usuarios"
            descricao="Gerencie contas, perfis de acesso, status e vinculos funcionais dos usuarios do SECP."
            artigo="Art. 20, inciso I"
            regraTitulo="Gerenciamento de usuarios"
            regraDescricao="O gerenciamento tecnico dos usuarios do sistema e atribuicao administrativa essencial para garantir seguranca, rastreabilidade e controle de acesso."
          />
        </div>

        <Link
          href="/usuarios/novo"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo usuario
        </Link>
      </section>

      <DataTableShell
        title="Usuarios cadastrados"
        description="Use a pesquisa geral ou filtre diretamente pelas colunas da tabela."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <UsuariosListagemControles
            exportCsvHref={`/api/usuarios/export?${exportParams.toString()}`}
            exportPdfHref={`/api/usuarios/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Listagem de usuarios com matricula, nome, tipo, lotacao, perfis,
              status e acoes.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Matricula/Login</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Lotacao</th>
                <th className="px-5 py-3">Perfis</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Acoes</th>
              </tr>
            </thead>

            <tbody>
              {resultado.usuarios.map((usuario) => {
                const lotacaoAtual = usuario.servidor?.lotacoes[0];

                return (
                  <tr key={usuario.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4 font-mono text-xs font-semibold">
                      {usuario.matricula}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold">{usuario.nome}</div>
                      {usuario.email && (
                        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {usuario.email}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                      {usuario.tipo}
                    </td>

                    <td className="px-5 py-4">
                      {lotacaoAtual?.unidade.sigla ?? "-"}
                    </td>

                    <td className="px-5 py-4">{usuario.perfis.length}</td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          usuario.ativo
                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/usuarios/${usuario.id}`}
                        className="text-sm font-semibold text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                      >
                        Detalhar
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {resultado.usuarios.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum usuario encontrado para os filtros informados.
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
