import Link from "next/link";
import { Edit, Plus, Tags } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function CategoriasPessoasPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "servidores:gerenciar:global",
    "servidores:gerenciar:seccional",
    "servidores:consultar:global",
    "servidores:consultar:seccional",
  ]);

  const categorias = await prisma.categoriaPessoa.findMany({
    include: {
      _count: {
        select: {
          servidores: true,
        },
      },
    },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Cadastro" },
          { label: "Categoria de pessoas" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <PageHeader
          icon={Tags}
          titulo="Categoria de pessoas"
          descricao="Cadastre as categorias usadas para classificar pessoas controladas pelo ponto."
          artigo="Cadastro auxiliar"
          regraTitulo="Categorias configuraveis"
          regraDescricao="As categorias aparecem no cadastro unificado de pessoas e podem representar servidores, estagiarios, voluntarios, prestadores e outros grupos."
        />

        <Link
          href="/categorias-pessoas/nova"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova categoria
        </Link>
      </section>

      <DataTableShell
        title="Categorias cadastradas"
        description="Categorias disponiveis para associar pessoas ao cadastro de ponto."
        total={categorias.length}
        pagina={1}
        totalPaginas={1}
        itensPorPagina={categorias.length || 10}
        montarHrefPagina={() => "/categorias-pessoas"}
        toolbar={null}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Codigo</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Pessoas</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((categoria) => (
                <tr key={categoria.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {categoria.codigo}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{categoria.nome}</div>
                    {categoria.descricao && (
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {categoria.descricao}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">{categoria._count.servidores}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        categoria.ativo
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {categoria.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/categorias-pessoas/${categoria.id}/editar`}
                      className="inline-flex items-center justify-end gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-[var(--muted)] dark:text-blue-300"
                    >
                      <Edit className="size-4" aria-hidden="true" />
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma categoria cadastrada.
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
