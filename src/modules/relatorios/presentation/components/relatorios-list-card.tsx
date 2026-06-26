import Link from "next/link";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Clock3,
  Download,
  FileCheck2,
  FileClock,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

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
  controles,
  mostrarGerenciais,
  mostrarLotacoesChefias,
}: {
  servidorId: string | null;
  ano: number;
  mes: number;
  boletins: BoletimRelatorioItem[];
  controles?: ReactNode;
  mostrarGerenciais: boolean;
  mostrarLotacoesChefias: boolean;
}) {
  const queryGerencial = new URLSearchParams({
    ano: String(ano),
    mes: String(mes),
  });

  if (servidorId) {
    queryGerencial.set("servidorId", servidorId);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold">Relatorios individuais</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Documentos por servidor para espelho de ponto e banco de horas.
            </p>
          </div>

          {controles ? <div className="lg:ml-auto">{controles}</div> : null}
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <RelatorioCard
            titulo="Espelho de Ponto"
            descricao="Exporta o espelho mensal com apuracoes diarias, creditos, debitos e status visual."
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
        </div>
      </section>

      {mostrarGerenciais && (
        <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">Relatorios gerenciais</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Visao consolidada conforme o escopo do perfil ativo.
            </p>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-3">
            <RelatorioCard
              titulo="Horas extras e banco de horas"
              descricao="Aponta creditos, debitos e saldo por servidor para gerir pagamentos e folgas."
              icon={BriefcaseBusiness}
              href={`/api/relatorios/gerenciais/horas-extras-banco-horas/pdf?${queryGerencial.toString()}`}
            />
            <RelatorioCard
              titulo="Absenteismo"
              descricao="Exibe faltas, dias com debito, saidas antecipadas e inconsistencias."
              icon={AlertTriangle}
              href={`/api/relatorios/gerenciais/absenteismo/pdf?${queryGerencial.toString()}`}
            />
            <RelatorioCard
              titulo="Jornada trabalhada"
              descricao="Mostra carga prevista, tempo trabalhado e percentual realizado no periodo."
              icon={Clock3}
              href={`/api/relatorios/gerenciais/jornada-trabalhada/pdf?${queryGerencial.toString()}`}
            />
            {mostrarLotacoesChefias && (
              <RelatorioCard
                titulo="Lotacoes com chefias"
                descricao="Lista unidades ativas que possuem chefia ou substituto registrado."
                icon={FileCheck2}
                href="/api/relatorios/gerenciais/lotacoes-chefias/pdf"
              />
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Boletins de Frequencia</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Boletins disponiveis para exportacao em PDF.
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
                  {boletim.unidade.sigla} -{" "}
                  {String(boletim.mesReferencia).padStart(2, "0")}/
                  {boletim.anoReferencia}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {boletim.unidade.nome} - {boletim.status}
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
              Nenhum boletim disponivel para exportacao.
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
    <article className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
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
              Selecione um servidor para habilitar a exportacao.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
