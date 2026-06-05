import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { gerarBoletimFrequenciaAction } from "@/modules/boletim-frequencia/application/actions/gerar-boletim-frequencia.action";
import {
  listarBoletinsFrequenciaPaginado,
  listarFechamentosHomologadosSemBoletim,
} from "@/modules/boletim-frequencia/infrastructure/repositories/boletim-frequencia.repository";
import {
  classeStatusBoletim,
  rotuloStatusBoletim,
} from "@/modules/boletim-frequencia/application/services/formatar-boletim-frequencia.service";
import { BoletinsListagemControles } from "@/modules/boletim-frequencia/presentation/components/boletins-listagem-controles";

type BoletimFrequenciaPageProps = {
  searchParams?: Promise<{
    busca?: string;
    anoReferencia?: string;
    mesReferencia?: string;
    unidade?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function BoletimFrequenciaPage({
  searchParams,
}: BoletimFrequenciaPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "boletim-frequencia:gerar:chefia",
    "boletim-frequencia:consultar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const [resultado, fechamentosDisponiveis] = await Promise.all([
    listarBoletinsFrequenciaPaginado({
      busca: params.busca ?? "",
      anoReferencia: params.anoReferencia ?? "",
      mesReferencia: params.mesReferencia ?? "",
      unidade: params.unidade ?? "",
      status: params.status ?? "",
      pagina,
      itensPorPagina,
    }),
    listarFechamentosHomologadosSemBoletim(),
  ]);

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "anoReferencia",
    "mesReferencia",
    "unidade",
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
    return `/boletim-frequencia?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Boletim de Frequencia" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Boletim de Frequencia
        </p>

        <PageHeader
          icon={FileCheck2}
          titulo="Boletins mensais"
          descricao="Gere, consulte e encaminhe a SECAP/NUCGP os boletins mensais de frequencia das unidades homologadas."
          artigo="Arts. 16 e 17"
          regraTitulo="Boletim apos homologacao"
          regraDescricao="Apos a homologacao da frequencia mensal, o boletim consolida as ocorrencias e deve ser encaminhado a SECAP/NUCGP dentro do prazo regulamentar."
        />
      </section>

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">
          Gerar boletim de fechamento homologado
        </h2>

        <form action={gerarBoletimFrequenciaAction} className="mt-4 space-y-4">
          <select
            name="fechamentoId"
            defaultValue=""
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            required
          >
            <option value="">Selecione o fechamento homologado</option>

            {fechamentosDisponiveis.map((fechamento) => (
              <option key={fechamento.id} value={fechamento.id}>
                {fechamento.unidade.sigla} -{" "}
                {String(fechamento.mesReferencia).padStart(2, "0")}/
                {fechamento.anoReferencia} - {fechamento.servidores.length}{" "}
                servidores
              </option>
            ))}
          </select>

          <textarea
            name="observacao"
            rows={3}
            placeholder="Observacao opcional para o boletim"
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
          />

          <button
            type="submit"
            className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Gerar boletim
          </button>
        </form>
      </section>

      <DataTableShell
        title="Boletins gerados"
        description="Use a pesquisa geral ou filtre por competencia, unidade e status."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <BoletinsListagemControles
            exportCsvHref={`/api/boletim-frequencia/export?${exportParams.toString()}`}
            exportPdfHref={`/api/boletim-frequencia/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Listagem de boletins de frequencia com referencia, unidade,
              servidores, status, processo SEI, responsavel e acoes.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Referencia</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Processo SEI</th>
                <th className="px-5 py-3">Gerado por</th>
                <th className="px-5 py-3 text-right">Acoes</th>
              </tr>
            </thead>

            <tbody>
              {resultado.boletins.map((boletim) => (
                <tr key={boletim.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-semibold">
                    {String(boletim.mesReferencia).padStart(2, "0")}/
                    {boletim.anoReferencia}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{boletim.unidade.sigla}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {boletim.unidade.nome}
                    </div>
                  </td>
                  <td className="px-5 py-4">{boletim._count.servidores}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatusBoletim(
                        boletim.status,
                      )}`}
                    >
                      {rotuloStatusBoletim(boletim.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4">{boletim.processoSei ?? "-"}</td>
                  <td className="px-5 py-4">{boletim.geradoPor.nome}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/boletim-frequencia/${boletim.id}`}
                      className="text-sm font-semibold text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {resultado.boletins.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum boletim encontrado para os filtros informados.
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
