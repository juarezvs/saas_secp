import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  Eye,
  FileCheck2,
  Plus,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import {
  formatarDataRecesso,
  formatarPeriodoRecesso,
} from "../../application/services/recesso-forense.service";
import { excluirRecessoForenseAction } from "../../application/actions/recesso-forense.actions";
import { ExcluirRecessoForenseButton } from "./excluir-recesso-forense-button";
import { RecessoStatusBadge } from "./recesso-status-badge";

type RecessoResumo = {
  id: string;
  ano: number;
  dataInicio: Date;
  dataFim: Date;
  status: string;
  convocacoes?: unknown[];
  convocados: Array<{
    dataConvocacao: Date;
    escolha: string;
  }>;
  homologacoes: Array<{ status: string }>;
};

type RecessoForenseDashboardRealProps = {
  recessos: RecessoResumo[];
  podeGerenciar: boolean;
  visualizacaoServidor?: boolean;
  podeGerenciarConvocacoes?: boolean;
};

export function RecessoForenseDashboardReal({
  recessos,
  podeGerenciar,
  visualizacaoServidor = false,
  podeGerenciarConvocacoes = false,
}: RecessoForenseDashboardRealProps) {
  const ativo = recessos[0];
  const exibirAcoes = !visualizacaoServidor || podeGerenciarConvocacoes;
  const pendencias = recessos.reduce(
    (total, recesso) =>
      total +
      recesso.homologacoes.filter((item) => item.status !== "ACEITO_SECAD")
        .length,
    0,
  );

  function formatarDatas(datas: Date[]) {
    if (datas.length === 0) {
      return "-";
    }

    return datas
      .sort((a, b) => a.getTime() - b.getTime())
      .map((data) => formatarDataRecesso(data))
      .join(", ");
  }

  function diasPorEscolha(
    recesso: RecessoResumo,
    escolha: "PECUNIA" | "FOLGA",
  ) {
    return recesso.convocados
      .filter((convocado) => convocado.escolha === escolha)
      .map((convocado) => convocado.dataConvocacao);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Recesso forense" }]} />

      <PageHeader
        icon={CalendarRange}
        titulo="Recesso forense"
        descricao="Módulo próprio para convocação, escolha de pecúnia ou folga, fechamento, homologação da chefia e aceite SECAD."
        artigo="Fluxo institucional"
        regraTitulo="Servidor -> chefia -> SECAD -> SEPAG/SECAP"
        regraDescricao="O recesso ocorre de 20/12 a 06/01. Dias não convocados aparecem como Recesso forense e não geram falta ou débito no ponto ordinário."
        actions={
          podeGerenciar ? (
            <Link
              href="/recesso-forense/novo"
              className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              <Plus className="size-4" aria-hidden="true" />
              Novo recesso
            </Link>
          ) : podeGerenciarConvocacoes && ativo ? (
            <Link
              href={`/recesso-forense/${ativo.id}/convocacoes`}
              className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              Gerenciar convocações
            </Link>
          ) : null
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <CalendarRange className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Recesso ativo
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {ativo ? ativo.ano : "Não cadastrado"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {ativo
              ? formatarPeriodoRecesso(ativo.dataInicio, ativo.dataFim)
              : "-"}
          </p>
        </article>

        <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <CalendarDays className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Dias convocados
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {ativo?.convocados.length ?? 0}
          </h2>
        </article>

        <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <FileCheck2 className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Pendências de fluxo
          </p>
          <h2 className="mt-1 text-xl font-bold">{pendencias}</h2>
        </article>
      </section>

      <section className="rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Recessos cadastrados</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Ano</th>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">
                  {visualizacaoServidor ? "Pecúnia" : "Convocações"}
                </th>
                <th className="px-5 py-3">
                  {visualizacaoServidor ? "Folga" : "Dias convocados"}
                </th>
                {exibirAcoes && <th className="px-5 py-3">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {recessos.map((recesso) => {
                const pecunia = diasPorEscolha(recesso, "PECUNIA");
                const folga = diasPorEscolha(recesso, "FOLGA");

                return (
                  <tr key={recesso.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4 font-semibold">{recesso.ano}</td>
                    <td className="px-5 py-4">
                      {formatarPeriodoRecesso(
                        recesso.dataInicio,
                        recesso.dataFim,
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <RecessoStatusBadge status={recesso.status} />
                    </td>
                    {visualizacaoServidor ? (
                      <>
                        <td className="max-w-[280px] px-5 py-4 text-[var(--muted-foreground)]">
                          {formatarDatas(pecunia)}
                        </td>
                        <td className="max-w-[280px] px-5 py-4 text-[var(--muted-foreground)]">
                          {formatarDatas(folga)}
                        </td>
                        {podeGerenciarConvocacoes && (
                          <td className="px-5 py-4">
                            <Link
                              href={`/recesso-forense/${recesso.id}/convocacoes`}
                              className="font-semibold text-blue-900 hover:underline dark:text-blue-300"
                            >
                              Gerenciar convocações
                            </Link>
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-4">
                          {recesso.convocacoes?.length ?? 0}
                        </td>
                        <td className="px-5 py-4">
                          {recesso.convocados.length}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/recesso-forense/${recesso.id}`}
                              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-[var(--muted)] dark:text-blue-300"
                            >
                              <Eye className="size-4" aria-hidden="true" />
                              Abrir
                            </Link>
                            {podeGerenciar ? (
                              <ExcluirRecessoForenseButton
                                action={excluirRecessoForenseAction}
                                recessoId={recesso.id}
                                ano={recesso.ano}
                              />
                            ) : null}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {recessos.length === 0 && (
                <tr>
                  <td
                    colSpan={exibirAcoes ? 6 : 5}
                    className="px-5 py-10 text-center"
                  >
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                      <p className="text-[var(--muted-foreground)]">
                        Nenhum recesso cadastrado.
                      </p>
                      {podeGerenciar && (
                        <Link
                          href="/recesso-forense/novo"
                          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
                        >
                          <Plus className="size-4" aria-hidden="true" />
                          Criar recesso forense
                        </Link>
                      )}
                    </div>
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
