import Link from "next/link";
import { CalendarRange, FileCheck2, Plus, Users } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { formatarPeriodoRecesso } from "../../application/services/recesso-forense.service";
import { RecessoStatusBadge } from "./recesso-status-badge";

type RecessoResumo = {
  id: string;
  ano: number;
  dataInicio: Date;
  dataFim: Date;
  status: string;
  convocacoes: unknown[];
  convocados: unknown[];
  homologacoes: Array<{ status: string }>;
};

type RecessoForenseDashboardRealProps = {
  recessos: RecessoResumo[];
  podeGerenciar: boolean;
};

export function RecessoForenseDashboardReal({
  recessos,
  podeGerenciar,
}: RecessoForenseDashboardRealProps) {
  const ativo = recessos[0];
  const pendencias = recessos.reduce(
    (total, recesso) =>
      total +
      recesso.homologacoes.filter((item) => item.status !== "ACEITO_SECAD")
        .length,
    0,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Recesso forense" }]} />

      <PageHeader
        icon={CalendarRange}
        titulo="Recesso forense"
        descricao="Modulo proprio para convocacao, escolha de pecunia ou folga, fechamento, homologacao da chefia e aceite SECAD."
        artigo="Fluxo institucional"
        regraTitulo="Servidor -> chefia -> SECAD -> SEPAG/SECAP"
        regraDescricao="O recesso ocorre de 20/12 a 06/01. Dias nao convocados aparecem como Recesso forense e nao geram falta ou debito no ponto ordinario."
        actions={
          podeGerenciar ? (
            <Link
              href="/recesso-forense/novo"
              className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              <Plus className="size-4" aria-hidden="true" />
              Novo recesso
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
            {ativo ? ativo.ano : "Nao cadastrado"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {ativo ? formatarPeriodoRecesso(ativo.dataInicio, ativo.dataFim) : "-"}
          </p>
        </article>

        <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <Users className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Convocados
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {ativo?.convocados.length ?? 0}
          </h2>
        </article>

        <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <FileCheck2 className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Pendencias de fluxo
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
                <th className="px-5 py-3">Periodo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Convocacoes</th>
                <th className="px-5 py-3">Convocados</th>
                <th className="px-5 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {recessos.map((recesso) => (
                <tr key={recesso.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-semibold">{recesso.ano}</td>
                  <td className="px-5 py-4">
                    {formatarPeriodoRecesso(recesso.dataInicio, recesso.dataFim)}
                  </td>
                  <td className="px-5 py-4">
                    <RecessoStatusBadge status={recesso.status} />
                  </td>
                  <td className="px-5 py-4">{recesso.convocacoes.length}</td>
                  <td className="px-5 py-4">{recesso.convocados.length}</td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/recesso-forense/${recesso.id}`}
                      className="font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {recessos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
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
