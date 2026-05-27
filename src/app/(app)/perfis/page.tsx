import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function PerfisPage() {
  await exigirPermissaoOuRedirecionar("perfis:gerenciar:global");

  const perfis = await prisma.perfil.findMany({
    orderBy: {
      nome: "asc",
    },
    include: {
      permissoes: {
        include: {
          permissao: true,
        },
      },
      _count: {
        select: {
          usuarios: true,
        },
      },
    },
  });

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

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Perfis e permissões
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
            Gerencie os perfis de acesso, permissões e escopos de atuação dos
            usuários do SECP.
          </p>
        </div>

        <Link
          href="/perfis/novo"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo perfil
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Art. 2º, inciso XII; Art. 16; Art. 20"
        titulo="Ações gerenciais e responsabilidades"
        descricao="O controle de acesso por perfis garante que chefias, delegados, administradores, SECAP, SECAD, DIREF e NUTEC executem apenas as ações compatíveis com suas responsabilidades institucionais."
      />

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="border-b p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="size-5 text-blue-900 dark:text-blue-300" />
            Perfis cadastrados
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
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
              {perfis.map((perfil) => (
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
                      className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {perfis.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-(--muted-foreground)"
                  >
                    Nenhum perfil cadastrado.
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
