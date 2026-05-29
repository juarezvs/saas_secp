import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarUsuarios } from "@/modules/usuarios/infrastructure/repositories/usuario.repository";
import { PageHeader } from "@/components/layout/page-header";

export default async function UsuariosPage() {
  await exigirPermissaoOuRedirecionar("usuarios:gerenciar:global");

  const usuarios = await listarUsuarios();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Usuários" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Administração de acessos
          </p>

          <PageHeader
            icon={UsersRound}
            titulo="Usuários"
            descricao=" Gerencie contas, perfis de acesso, status e vínculos funcionais dos
          usuários do SECP."
            artigo="Art. 20, inciso I"
            regraTitulo="Gerenciamento de usuários"
            regraDescricao="O gerenciamento técnico dos usuários do sistema é atribuição administrativa essencial para garantir segurança, rastreabilidade e controle de acesso."
            // actions={
            //   <Link
            //     href="/servidores/novo"
            //     className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            //   >
            //     Novo servidor
            //   </Link>
            // }
          />
        </div>

        <Link
          href="/usuarios/novo"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo usuário
        </Link>
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <UsersRound className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Usuários cadastrados</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Matrícula/Login</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Lotação</th>
                <th className="px-5 py-3">Perfis</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((usuario) => {
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
                        className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                      >
                        Detalhar
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {usuarios.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
