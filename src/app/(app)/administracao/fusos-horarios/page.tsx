import Link from "next/link";
import { Clock3, Edit, Plus } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarFusosHorarios } from "@/modules/fusos-horarios/infrastructure/repositories/fuso-horario.repository";

type FusosHorariosPageProps = {
  searchParams?: Promise<{
    busca?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function FusosHorariosPage({
  searchParams,
}: FusosHorariosPageProps) {
  await exigirPermissaoOuRedirecionar("fusos-horarios:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const todosFusos = await listarFusosHorarios({
    busca: params.busca ?? "",
    status: params.status ?? "",
  });
  const totalPaginas = Math.max(Math.ceil(todosFusos.length / itensPorPagina), 1);
  const fusos = todosFusos.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina,
  );
  const baseParams = new URLSearchParams();

  if (params.busca) {
    baseParams.set("busca", params.busca);
  }

  if (params.status) {
    baseParams.set("status", params.status);
  }

  baseParams.set("itensPorPagina", String(itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/administracao/fusos-horarios?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Fusos horários" },
        ]}
      />

      <PageHeader
        icon={Clock3}
        titulo="Fusos horários"
        descricao="Gerencie os identificadores técnicos de fuso usados para data de referência, competência, cálculos, marcações e relatórios."
      />

      <div className="flex justify-end">
        <Link
          href="/administracao/fusos-horarios/novo"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo fuso
        </Link>
      </div>

      <DataTableShell
        title="Fusos cadastrados"
        description="O identificador é o valor gravado em órgãos e unidades. Rótulo e descrição são apenas apoio visual."
        total={todosFusos.length}
        pagina={pagina}
        totalPaginas={totalPaginas}
        itensPorPagina={itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <input
              name="busca"
              defaultValue={params.busca ?? ""}
              placeholder="Buscar por identificador, rótulo ou descrição"
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            />
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            >
              <option value="">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <button
              type="submit"
              className="rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)]"
            >
              Filtrar
            </button>
          </form>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Identificador</th>
                <th className="px-5 py-3">Rótulo</th>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Acoes</th>
              </tr>
            </thead>

            <tbody>
              {fusos.map((fuso) => (
                <tr key={fuso.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {fuso.valor}
                  </td>
                  <td className="px-5 py-4 font-semibold">{fuso.rotulo}</td>
                  <td className="px-5 py-4 text-[var(--muted-foreground)]">
                    {fuso.descricao ?? "-"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        fuso.ativo
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {fuso.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/administracao/fusos-horarios/${fuso.id}/editar`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      <Edit className="size-4" aria-hidden="true" />
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}

              {fusos.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum fuso horário encontrado.
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
