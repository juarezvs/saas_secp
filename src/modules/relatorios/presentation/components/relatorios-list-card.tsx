import Link from "next/link";
import { Download, FileCheck2, FileClock, WalletCards } from "lucide-react";

type BoletimRelatorioItem = {
  id: string;
  anoReferencia: number;
  mesReferencia: number;
  status: string;
  unidade: {
    sigla: string;
    nome: string;
  };
};

export function RelatoriosListCard({
  servidorId,
  ano,
  mes,
  boletins,
}: {
  servidorId: string | null;
  ano: number;
  mes: number;
  boletins: BoletimRelatorioItem[];
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <RelatorioCard
          titulo="Espelho de Ponto"
          descricao="Exporta o espelho mensal com apurações diárias, créditos, débitos e status."
          icon={FileClock}
          href={
            servidorId
              ? `/api/relatorios/espelho/${servidorId}/pdf?ano=${ano}&mes=${mes}`
              : null
          }
        />

        <RelatorioCard
          titulo="Banco de Horas"
          descricao="Exporta saldo consolidado e movimentos do banco de horas."
          icon={WalletCards}
          href={
            servidorId
              ? `/api/relatorios/banco-horas/${servidorId}/pdf?ano=${ano}&mes=${mes}`
              : null
          }
        />
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Boletins de Frequência</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Boletins disponíveis para exportação em PDF.
          </p>
        </div>

        <div className="divide-y">
          {boletins.map((boletim) => (
            <div
              key={boletim.id}
              className="flex flex-col justify-between gap-3 p-5 md:flex-row md:items-center"
            >
              <div>
                <p className="font-semibold">
                  {boletim.unidade.sigla} —{" "}
                  {String(boletim.mesReferencia).padStart(2, "0")}/
                  {boletim.anoReferencia}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {boletim.unidade.nome} • {boletim.status}
                </p>
              </div>

              <Link
                href={`/api/relatorios/boletim/${boletim.id}/pdf`}
                className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
              >
                <Download className="size-4" aria-hidden="true" />
                PDF
              </Link>
            </div>
          ))}

          {boletins.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhum boletim disponível para exportação.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function RelatorioCard({
  titulo,
  descricao,
  icon: Icon,
  href,
}: {
  titulo: string;
  descricao: string;
  icon: typeof FileCheck2;
  href: string | null;
}) {
  return (
    <article className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <div className="flex-1">
          <h3 className="font-bold">{titulo}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {descricao}
          </p>

          {href ? (
            <Link
              href={href}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              <Download className="size-4" aria-hidden="true" />
              Exportar PDF
            </Link>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              Selecione um servidor para habilitar a exportação.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
