import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, ShieldCheck, UsersRound } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarPerfilPorId } from "@/modules/perfis/infrastructure/repositories/perfil.repository";

type PerfilDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PerfilDetalhePage({
  params,
}: PerfilDetalhePageProps) {
  await exigirPermissaoOuRedirecionar("perfis:gerenciar:global");

  const { id } = await params;
  const perfil = await buscarPerfilPorId(id);

  if (!perfil) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Perfis e permissões", href: "/perfis" },
          { label: perfil.nome },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Perfil de acesso
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {perfil.nome}
          </h1>

          <p className="mt-2 font-mono text-sm text-[var(--muted-foreground)]">
            {perfil.codigo}
          </p>
        </div>

        <Link
          href={`/perfis/${perfil.id}/editar`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Edit className="size-4" aria-hidden="true" />
          Editar perfil
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Art. 2º, inciso XII"
        titulo="Ações gerenciais no sistema"
        descricao="O perfil controla quais ações gerenciais, administrativas ou de consulta cada usuário poderá executar no sistema de controle eletrônico de frequência."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Status</p>
          <h2 className="mt-2 text-2xl font-bold">
            {perfil.ativo ? "Ativo" : "Inativo"}
          </h2>
        </div>

        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Permissões</p>
          <h2 className="mt-2 text-2xl font-bold">
            {perfil.permissoes.length}
          </h2>
        </div>

        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Usuários</p>
          <h2 className="mt-2 text-2xl font-bold">{perfil.usuarios.length}</h2>
        </div>
      </section>

      {perfil.descricao && (
        <section className="rounded-xl border bg-[var(--card)] p-6 shadow-sm">
          <h2 className="text-lg font-bold">Descrição</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {perfil.descricao}
          </p>
        </section>
      )}

      <section className="rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <ShieldCheck className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Permissões vinculadas</h2>
        </div>

        <div className="divide-y">
          {perfil.permissoes.map((item) => (
            <div key={item.id} className="p-5">
              <code className="text-sm font-semibold">
                {item.permissao.codigo}
              </code>

              {item.permissao.descricao && (
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  {item.permissao.descricao}
                </p>
              )}
            </div>
          ))}

          {perfil.permissoes.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhuma permissão vinculada.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <UsersRound className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Usuários vinculados</h2>
        </div>

        <div className="divide-y">
          {perfil.usuarios.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-2 p-5 md:flex-row md:items-center"
            >
              <div>
                <p className="font-semibold">{item.usuario.nome}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Matrícula: {item.usuario.matricula}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                  item.ativo
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {item.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
          ))}

          {perfil.usuarios.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhum usuário vinculado a este perfil.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
