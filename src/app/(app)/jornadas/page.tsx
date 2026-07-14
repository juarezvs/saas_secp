import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarJornadasPaginado,
} from "@/modules/jornadas/infrastructure/repositories/jornada.repository";
import { JornadasListagemControles } from "@/modules/jornadas/presentation/components/jornadas-listagem-controles";

type JornadasPageProps = {
  searchParams?: Promise<{
    busca?: string;
    codigo?: string;
    nome?: string;
    tipo?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

function minutosParaHoras(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${resto}`;
}

export default async function JornadasPage({
  searchParams,
}: JornadasPageProps) {
  await exigirPermissaoOuRedirecionar("jornadas:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const resultado = await listarJornadasPaginado({
    busca: params.busca ?? "",
    codigo: params.codigo ?? "",
    nome: params.nome ?? "",
    tipo: params.tipo ?? "",
    status: params.status ?? "",
    orgaoIdsPermitidos,
    pagina,
    itensPorPagina,
  });

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "codigo",
    "nome",
    "tipo",
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
    return `/jornadas?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Jornadas" }]} />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Jornada e escala
          </p>

          <PageHeader
            icon={CalendarClock}
            titulo="Jornadas"
            descricao="Gerencie jornadas de 7h, 8h, especiais e atribuicoes de jornada aos servidores."
            artigo="Arts. 4, 8 e 18"
            regraTitulo="Jornada cadastrada e apuração futura"
            regraDescricao="O sistema deve manter a jornada a ser cumprida pelo servidor, permitindo apurar a carga mensal e comparar com a jornada esperada no mês de referência."
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/jornadas/atribuicoes"
            className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Atribuir jornada
          </Link>
          <Link
            href="/jornadas/nova"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nova jornada
          </Link>
        </div>
      </section>

      <DataTableShell
        title="Jornadas cadastradas"
        description="Use a pesquisa geral ou filtre por código, nome, tipo e status."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <JornadasListagemControles
            exportCsvHref={`/api/jornadas/export?${exportParams.toString()}`}
            exportPdfHref={`/api/jornadas/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <caption className="sr-only">
              Listagem de jornadas com código, nome, tipo, carga, intervalo,
              escalas, servidores, status e ações.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Carga</th>
                <th className="px-5 py-3">Intervalo</th>
                <th className="px-5 py-3">Escalas</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.jornadas.map((jornada) => (
                <tr key={jornada.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {jornada.codigo}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{jornada.nome}</div>
                    {jornada.descricao && (
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {jornada.descricao}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                    {jornada.tipo}
                  </td>
                  <td className="px-5 py-4">
                    {minutosParaHoras(jornada.cargaDiariaMinutos)}
                  </td>
                  <td className="px-5 py-4">
                    {jornada.exigeIntervalo
                      ? `${jornada.intervaloMinimoMinutos ?? "-"} a ${
                          jornada.intervaloMaximoMinutos ?? "-"
                        } min`
                      : "Não"}
                  </td>
                  <td className="px-5 py-4">{jornada._count.escalas}</td>
                  <td className="px-5 py-4">{jornada._count.servidores}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        jornada.ativo
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {jornada.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/jornadas/${jornada.id}`}
                      className="text-sm font-semibold text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {resultado.jornadas.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma jornada encontrada para os filtros informados.
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
