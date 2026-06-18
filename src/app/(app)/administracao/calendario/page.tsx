import Link from "next/link";
import { CalendarDays, Edit } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarCalendarioInstitucionalAction } from "@/modules/calendario-institucional/application/actions/criar-calendario-institucional.action";
import { listarCalendarioInstitucionalPaginado } from "@/modules/calendario-institucional/infrastructure/repositories/calendario-institucional.repository";
import { CalendarioInstitucionalForm } from "@/modules/calendario-institucional/presentation/components/calendario-institucional-form";

type CalendarioInstitucionalPageProps = {
  searchParams?: Promise<{
    busca?: string;
    tipo?: string;
    status?: string;
    ano?: string;
    mes?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

const rotulosTipo: Record<string, string> = {
  FERIADO: "Feriado",
  PONTO_FACULTATIVO: "Ponto facultativo",
  SUSPENSAO_EXPEDIENTE: "Suspensão do expediente",
};

function formatarDataUtc(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(data);
}

export default async function CalendarioInstitucionalPage({
  searchParams,
}: CalendarioInstitucionalPageProps) {
  await exigirPermissaoOuRedirecionar("configuracoes:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const resultado = await listarCalendarioInstitucionalPaginado({
    busca: params.busca ?? "",
    tipo: params.tipo ?? "",
    status: params.status ?? "",
    ano: params.ano ?? "",
    mes: params.mes ?? "",
    pagina,
    itensPorPagina,
  });

  const baseParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "tipo",
    "status",
    "ano",
    "mes",
  ] as const) {
    if (params[chave]) {
      baseParams.set(chave, params[chave]!);
    }
  }

  baseParams.set("itensPorPagina", String(resultado.itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/administracao/calendario?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Calendário institucional" },
        ]}
      />

      <PageHeader
        icon={CalendarDays}
        titulo="Calendário institucional"
        descricao="Cadastre os dias que alteram a rotina ordinária do órgão, com reflexos em prazos regulamentares e na apuração diária do ponto."
        artigo="Arts. 16, 17 e fluxo institucional"
        regraTitulo="Prazos e expediente"
        regraDescricao="Feriados, pontos facultativos, suspensões de expediente e recesso forense precisam refletir corretamente nos prazos de homologação, boletim e na apuração do ponto."
      />

      <CalendarioInstitucionalForm
        action={criarCalendarioInstitucionalAction}
        modo="criar"
      />

      <DataTableShell
        title="Eventos cadastrados"
        description="Filtre por tipo, ano, mês, status e termos livres da descrição."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <form method="GET" className="grid gap-3 md:grid-cols-6">
            <input
              type="text"
              name="busca"
              defaultValue={params.busca ?? ""}
              placeholder="Buscar descrição"
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm md:col-span-2"
            />
            <select
              name="tipo"
              defaultValue={params.tipo ?? ""}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            >
              <option value="">Todos os tipos</option>
              <option value="FERIADO">Feriado</option>
              <option value="PONTO_FACULTATIVO">Ponto facultativo</option>
              <option value="SUSPENSAO_EXPEDIENTE">Suspensão do expediente</option>
            </select>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <input
              type="number"
              name="ano"
              min={2000}
              max={2100}
              defaultValue={params.ano ?? ""}
              placeholder="Ano"
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            />
            <input
              type="number"
              name="mes"
              min={1}
              max={12}
              defaultValue={params.mes ?? ""}
              placeholder="Mês"
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            />
            <div className="flex gap-2 md:col-span-6">
              <button
                type="submit"
                className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
              >
                Filtrar
              </button>
              <Link
                href="/administracao/calendario"
                className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
              >
                Limpar
              </Link>
            </div>
          </form>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Listagem de eventos do calendário institucional com data, tipo,
              descrição, parâmetros de prazo, apuração e ações.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Dia útil</th>
                <th className="px-5 py-3">Apuração regular</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.eventos.map((evento) => (
                <tr key={evento.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-semibold">
                    {formatarDataUtc(evento.dataReferencia)}
                  </td>
                  <td className="px-5 py-4">
                    {rotulosTipo[evento.tipo] ?? evento.tipo}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{evento.descricao}</div>
                    {evento.observacao && (
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {evento.observacao}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {evento.contaComoDiaUtil ? "Sim" : "Não"}
                  </td>
                  <td className="px-5 py-4">
                    {evento.geraApuracaoRegular ? "Sim" : "Não"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        evento.ativo
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {evento.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/administracao/calendario/${evento.id}/editar`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      <Edit className="size-4" aria-hidden="true" />
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}

              {resultado.eventos.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum evento institucional encontrado para os filtros informados.
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
