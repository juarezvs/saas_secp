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
import { RelatorioExportacaoButton } from "./relatorio-exportacao-button";

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
  const queryHorasExtras = new URLSearchParams({
    competencia: `${ano}-${String(mes).padStart(2, "0")}`,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold">Relatórios individuais</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Documentos por servidor na competência{" "}
              {String(mes).padStart(2, "0")}/{ano}.
            </p>
          </div>

          {controles ? <div className="lg:ml-auto">{controles}</div> : null}
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <RelatorioCard
            titulo="Espelho de Ponto"
            descricao="Exporta o espelho mensal com apuracoes diarias, creditos, debitos e status visual."
            icon={FileClock}
            href={
              servidorId
                ? `/api/relatorios/espelho/${servidorId}/pdf?ano=${ano}&mes=${mes}`
                : null
            }
            assincrono
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
            assincrono
          />
        </div>
      </section>

      {mostrarGerenciais && (
        <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">Relatórios gerenciais</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Visao consolidada conforme o escopo do perfil ativo.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            <RelatorioCard
              titulo="Horas extras e banco de horas"
              descricao="Aponta creditos, debitos e saldo por servidor para gerir pagamentos e folgas."
              icon={BriefcaseBusiness}
              href={`/api/relatorios/gerenciais/horas-extras-banco-horas/pdf?${queryGerencial.toString()}`}
              assincrono
            />
            <RelatorioCard
              titulo="Horas extras analitico"
              descricao="CSV detalhado por autorizacao, servidor, intervalo, rubrica e valor calculado."
              icon={Download}
              href={`/api/horas-extras/relatorios/analitico?${queryHorasExtras.toString()}`}
            />
            <RelatorioCard
              titulo="Horas extras sintetico"
              descricao="CSV consolidado por servidor, competencia, rubricas, minutos e valor."
              icon={Download}
              href={`/api/horas-extras/relatorios/sintetico?${queryHorasExtras.toString()}`}
            />
            <RelatorioCard
              titulo="Absenteismo"
              descricao="Exibe faltas, dias com debito, saidas antecipadas e inconsistencias."
              icon={AlertTriangle}
              href={`/api/relatorios/gerenciais/absenteismo/pdf?${queryGerencial.toString()}`}
              assincrono
            />
            <RelatorioCard
              titulo="Jornada trabalhada"
              descricao="Mostra carga prevista, tempo trabalhado e percentual realizado no periodo."
              icon={Clock3}
              href={`/api/relatorios/gerenciais/jornada-trabalhada/pdf?${queryGerencial.toString()}`}
              assincrono
            />
            {mostrarLotacoesChefias && (
              <RelatorioCard
                titulo="Lotacoes com chefias"
                descricao="Lista unidades ativas que possuem chefia ou substituto registrado."
                icon={FileCheck2}
                href="/api/relatorios/gerenciais/lotacoes-chefias/pdf"
                assincrono
              />
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Boletins de Frequência</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Boletins disponiveis para exportacao em PDF.
          </p>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {boletins.map((boletim) => (
            <article
              key={boletim.id}
              className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
            >
              <div className="flex min-h-32 flex-col">
                <p className="font-semibold">
                  {boletim.unidade.sigla} -{" "}
                  {String(boletim.mesReferencia).padStart(2, "0")}/
                  {boletim.anoReferencia}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {boletim.unidade.nome}
                </p>
                <span className="mt-3 w-fit rounded-full border px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                  {boletim.status}
                </span>
                <div className="mt-auto pt-4">
                  <RelatorioExportacaoButton
                    href={`/api/relatorios/boletim/${boletim.id}/pdf`}
                  >
                    PDF
                  </RelatorioExportacaoButton>
                </div>
              </div>
            </article>
          ))}

          {boletins.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-[var(--muted-foreground)] md:col-span-2 xl:col-span-3">
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
  assincrono = false,
}: {
  titulo: string;
  descricao: string;
  icon: typeof FileCheck2;
  href: string | null;
  assincrono?: boolean;
}) {
  return (
    <article className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3">
        <div className="secp-theme-icon rounded-lg p-3">
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{titulo}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {descricao}
          </p>

          {href && assincrono ? (
            <RelatorioExportacaoButton href={href} />
          ) : href ? (
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
