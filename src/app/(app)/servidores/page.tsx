import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarServidores } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

export default async function ServidoresPage() {
  await exigirPermissaoOuRedirecionar("servidores:gerenciar:global");

  const servidores = await listarServidores();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Servidores" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Cadastro funcional
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">Servidores</h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-(--muted-foreground)">
            Gerencie servidores, vínculos funcionais, usuários relacionados e
            lotações em unidades organizacionais.
          </p>
        </div>

        <Link
          href="/servidores/novo"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo servidor
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Arts. 4º, 8º e 16"
        titulo="Servidor, jornada, lotação e homologação"
        descricao="O cadastro do servidor e sua lotação são base para jornada, apuração mensal, banco de horas, subordinação e homologação pela chefia."
      />

      <section className="rounded-xl border bg-(--card) text-(--card-foreground) shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <UsersRound className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Servidores cadastrados</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-245 text-left text-sm">
            <thead className="border-b bg-(--muted) text-xs uppercase tracking-wide text-(--muted-foreground)">
              <tr>
                <th className="px-5 py-3">Matrícula</th>
                <th className="px-5 py-3">Cpf</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Órgão</th>
                <th className="px-5 py-3">Vínculo</th>
                <th className="px-5 py-3">Lotação atual</th>
                <th className="px-5 py-3">Lotações</th>
                <th className="px-5 py-3">Gestões</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {servidores.map((servidor) => {
                const lotacaoAtual = servidor.lotacoes[0];

                return (
                  <tr key={servidor.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4 font-mono text-xs font-semibold">
                      {servidor.matricula}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold">
                      {servidor.cpf ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {servidor.usuario.nome}
                      </div>
                      {servidor.usuario.email && (
                        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {servidor.usuario.email}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">{servidor.orgao.sigla}</td>

                    <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                      {servidor.vinculo}
                    </td>

                    <td className="px-5 py-4">
                      {lotacaoAtual ? lotacaoAtual.unidade.sigla : "-"}
                    </td>

                    <td className="px-5 py-4">{servidor._count.lotacoes}</td>

                    <td className="px-5 py-4">{servidor._count.gestores}</td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          servidor.ativo
                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {servidor.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/servidores/${servidor.id}`}
                        className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                      >
                        Detalhar
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {servidores.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum servidor cadastrado.
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
