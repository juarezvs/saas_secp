import { FileCheck2 } from "lucide-react";
import {
  classeStatusBoletim,
  minutosParaHoraBoletim,
  rotuloStatusBoletim,
} from "../../application/services/formatar-boletim-frequencia.service";
import {
  calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario,
  descreverPrazoRegulatorio,
  formatarDataPrazoRegulatorio,
  rotuloSituacaoPrazoRegulatorio,
} from "@/modules/frequencia/application/services/prazo-regulatorio-frequencia.service";

type BoletimFrequenciaCardProps = {
  boletim: {
    unidade: {
      sigla: string;
      nome: string;
    };
    anoReferencia: number;
    mesReferencia: number;
    status: string;
    totalServidores: number;
    totalHomologados: number;
    totalComRessalva: number;
    totalFaltas: number;
    totalCargaPrevistaMinutos: number;
    totalTrabalhadoMinutos: number;
    totalCreditoMinutos: number;
    totalDebitoMinutos: number;
    processoSei: string | null;
    numeroSei: string | null;
    geradoEm: Date;
    encaminhadoEm: Date | null;
    recebidoEm: Date | null;
  };
};

export async function BoletimFrequenciaCard({
  boletim,
}: BoletimFrequenciaCardProps) {
  const prazoEncaminhamento =
    await calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario({
    anoReferencia: boletim.anoReferencia,
    mesReferencia: boletim.mesReferencia,
    concluidoEm: boletim.encaminhadoEm,
  });

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3">
        <FileCheck2 className="mt-1 size-6 text-blue-900 dark:text-blue-300" />

        <div className="flex-1">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
                Boletim de Frequência
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {boletim.unidade.sigla} —{" "}
                {String(boletim.mesReferencia).padStart(2, "0")}/
                {boletim.anoReferencia}
              </h2>

              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {boletim.unidade.nome}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${classeStatusBoletim(
                boletim.status,
              )}`}
            >
              {rotuloStatusBoletim(boletim.status)}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Info label="Servidores" value={String(boletim.totalServidores)} />
            <Info
              label="Homologados"
              value={String(boletim.totalHomologados)}
            />
            <Info
              label="Com ressalva"
              value={String(boletim.totalComRessalva)}
            />
            <Info label="Faltas" value={String(boletim.totalFaltas)} />
            <Info
              label="Previsto"
              value={minutosParaHoraBoletim(boletim.totalCargaPrevistaMinutos)}
            />
            <Info
              label="Trabalhado"
              value={minutosParaHoraBoletim(boletim.totalTrabalhadoMinutos)}
            />
            <Info
              label="Crédito"
              value={minutosParaHoraBoletim(boletim.totalCreditoMinutos)}
            />
            <Info
              label="Débito"
              value={minutosParaHoraBoletim(boletim.totalDebitoMinutos)}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Info label="Processo SEI" value={boletim.processoSei ?? "-"} />
            <Info label="Documento SEI" value={boletim.numeroSei ?? "-"} />
            <Info
              label="Prazo envio"
              value={`${formatarDataPrazoRegulatorio(
                prazoEncaminhamento.dataLimite,
              )} - ${rotuloSituacaoPrazoRegulatorio(
                prazoEncaminhamento.situacao,
              )}`}
              detail={descreverPrazoRegulatorio(prazoEncaminhamento)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border bg-[var(--muted)] p-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 font-bold">{value}</p>
      {detail ? (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{detail}</p>
      ) : null}
    </div>
  );
}
