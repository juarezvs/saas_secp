import Link from "next/link";
import { CalendarDays, FileCheck2, Users } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import {
  formatarDataRecesso,
  formatarPeriodoRecesso,
} from "../../application/services/recesso-forense.service";
import { fecharRecessoForenseAction } from "../../application/actions/recesso-forense.actions";
import { RecessoStatusBadge } from "./recesso-status-badge";

type RecessoDetalheProps = {
  recesso: {
    id: string;
    ano: number;
    dataInicio: Date;
    dataFim: Date;
    status: string;
    observacao: string | null;
    convocacoes: unknown[];
    convocados: Array<{
      id: string;
      dataConvocacao: Date;
      escolha: string;
      status: string;
      servidor: {
        id: string;
        matricula: string;
        usuario: { nome: string };
        lotacoes: Array<{ unidade: { sigla: string } }>;
      };
      convocacao: {
        id: string;
        numeroPortaria: string;
      };
    }>;
    homologacoes: unknown[];
  };
};

function agruparConvocadosRecesso(recesso: RecessoDetalheProps["recesso"]) {
  const grupos = new Map<
    string,
    {
      servidorId: string;
      nome: string;
      matricula: string;
      unidade: string;
      portarias: string[];
      pecunia: Date[];
      folga: Date[];
      statuses: string[];
    }
  >();

  recesso.convocados.forEach((item) => {
    const grupo =
      grupos.get(item.servidor.id) ??
      {
        servidorId: item.servidor.id,
        nome: item.servidor.usuario.nome,
        matricula: item.servidor.matricula,
        unidade: item.servidor.lotacoes[0]?.unidade.sigla ?? "-",
        portarias: [],
        pecunia: [],
        folga: [],
        statuses: [],
      };

    if (!grupo.portarias.includes(item.convocacao.numeroPortaria)) {
      grupo.portarias.push(item.convocacao.numeroPortaria);
    }

    if (item.escolha === "FOLGA") {
      grupo.folga.push(item.dataConvocacao);
    } else {
      grupo.pecunia.push(item.dataConvocacao);
    }

    grupo.statuses.push(item.status);
    grupos.set(item.servidor.id, grupo);
  });

  return Array.from(grupos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

function formatarDatas(datas: Date[]) {
  if (datas.length === 0) {
    return "-";
  }

  return datas
    .sort((a, b) => a.getTime() - b.getTime())
    .map((data) => formatarDataRecesso(data))
    .join(", ");
}

function statusConsolidado(statuses: string[]) {
  const unicos = Array.from(new Set(statuses));
  return unicos.length === 1 ? unicos[0] : "MISTO";
}

export function RecessoDetalhe({ recesso }: RecessoDetalheProps) {
  const convocadosAgrupados = agruparConvocadosRecesso(recesso);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Recesso forense", href: "/recesso-forense" },
          { label: String(recesso.ano) },
        ]}
      />

      <PageHeader
        icon={CalendarDays}
        titulo={`Recesso ${recesso.ano}`}
        descricao={formatarPeriodoRecesso(recesso.dataInicio, recesso.dataFim)}
        artigo="Modulo proprio"
        regraTitulo="Fechamento separado"
        regraDescricao="Dezembro e janeiro devem ser fechados separadamente pelo servidor antes da homologacao."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]" href={`/recesso-forense/${recesso.id}/convocacoes`}>
              Convocacoes
            </Link>
            <Link className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]" href={`/recesso-forense/${recesso.id}/espelho`}>
              Espelho
            </Link>
            <Link className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]" href={`/recesso-forense/${recesso.id}/homologacao`}>
              Homologacao
            </Link>
            <form action={fecharRecessoForenseAction}>
              <input type="hidden" name="recessoId" value={recesso.id} />
              <button
                type="submit"
                className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
              >
                Fechar recesso
              </button>
            </form>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Status</p>
          <div className="mt-2">
            <RecessoStatusBadge status={recesso.status} />
          </div>
        </article>
        <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <Users className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Convocados</p>
          <h2 className="mt-1 text-xl font-bold">{recesso.convocados.length}</h2>
        </article>
        <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <CalendarDays className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Portarias</p>
          <h2 className="mt-1 text-xl font-bold">{recesso.convocacoes.length}</h2>
        </article>
        <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <FileCheck2 className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Homologacoes</p>
          <h2 className="mt-1 text-xl font-bold">{recesso.homologacoes.length}</h2>
        </article>
      </section>

      {recesso.observacao && (
        <section className="rounded-xl border bg-[var(--card)] p-5 text-sm leading-6 shadow-sm">
          {recesso.observacao}
        </section>
      )}

      <section className="rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-bold">Servidores convocados</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Resumo consolidado das escolhas registradas para todo o recesso.
            </p>
          </div>
          <Link
            href={`/recesso-forense/${recesso.id}/convocacoes`}
            className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
          >
            Gerenciar convocacoes
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Servidor</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Portaria</th>
                <th className="px-5 py-3">Pecunia</th>
                <th className="px-5 py-3">Folga</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {convocadosAgrupados.map((item) => (
                <tr key={item.servidorId} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{item.nome}</div>
                    <div className="font-mono text-xs text-[var(--muted-foreground)]">
                      {item.matricula}
                    </div>
                  </td>
                  <td className="px-5 py-4">{item.unidade}</td>
                  <td className="px-5 py-4 text-[var(--muted-foreground)]">
                    {item.portarias.join(", ")}
                  </td>
                  <td className="max-w-[260px] px-5 py-4 text-[var(--muted-foreground)]">
                    {formatarDatas(item.pecunia)}
                  </td>
                  <td className="max-w-[260px] px-5 py-4 text-[var(--muted-foreground)]">
                    {formatarDatas(item.folga)}
                  </td>
                  <td className="px-5 py-4">
                    <RecessoStatusBadge status={statusConsolidado(item.statuses)} />
                  </td>
                </tr>
              ))}
              {convocadosAgrupados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[var(--muted-foreground)]">
                    Nenhum servidor convocado para este recesso.
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
