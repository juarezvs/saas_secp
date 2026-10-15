"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
  MoreVertical,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  Badge,
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { gerarAnaliseJornadaAction } from "../../application/actions/gerar-analise-jornada.action";
import type { AnaliseJornadaMctDto } from "../../application/dtos/analise-jornada.dto";

type ResultadoJornada = Partial<{
  jornadaPrevistaMinutos: number;
  jornadaExigivelMinutos: number;
  permanenciaBrutaMinutos: number;
  tempoEfetivamenteTrabalhadoMinutos: number;
  intervalosNaoComputaveisMinutos: number;
  tempoComputavelMinutos: number;
  tempoFaltanteMinutos: number;
  excedenteBrutoMinutos: number;
  creditoReconhecidoMinutos: number;
  debitoReconhecidoMinutos: number;
  excedentePendenteMinutos: number;
}>;

function resultadoJornada(valor: unknown): ResultadoJornada {
  return valor && typeof valor === "object" ? (valor as ResultadoJornada) : {};
}

function tempo(minutos: number | undefined) {
  const total = Math.max(0, minutos ?? 0);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function horario(valor: string, fusoHorario = "America/Manaus") {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: fusoHorario,
  }).format(new Date(valor));
}

function horarioReferencia(valor: string, fusoHorario = "America/Manaus") {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fusoHorario,
  }).format(new Date(valor));
}

function dataLonga(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${valor}T12:00:00.000Z`));
}

function Resumo({
  label,
  valor,
  destaque = "neutro",
}: {
  label: string;
  valor: string;
  destaque?: "neutro" | "trabalho" | "intervalo" | "excedente";
}) {
  const cores = {
    neutro:
      "border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
    trabalho:
      "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
    intervalo:
      "border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50",
    excedente:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  };

  return (
    <div className={`border px-4 py-3 ${cores[destaque]}`}>
      <dt className="text-xs font-medium text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-xl font-semibold">{valor}</dd>
    </div>
  );
}

function percentual(parte: number, total: number) {
  return total > 0 ? Math.max(0, Math.min(100, (parte / total) * 100)) : 0;
}

type BlocoLinhaTemporal = {
  chave: string;
  tipo: "atraso" | "regular" | "intervalo" | "excedente" | "faltante";
  minutos: number;
  inicio?: Date;
  fim?: Date;
};

function adicionarBlocoLinhaTemporal(
  blocos: BlocoLinhaTemporal[],
  bloco: BlocoLinhaTemporal,
) {
  const anterior = blocos.at(-1);
  const contiguo =
    anterior?.fim &&
    bloco.inicio &&
    anterior.fim.getTime() === bloco.inicio.getTime();

  if (anterior && anterior.tipo === bloco.tipo && contiguo) {
    anterior.minutos += bloco.minutos;
    anterior.fim = bloco.fim;
    return;
  }

  blocos.push(bloco);
}

function minutosAtrasoEntrada(analise: AnaliseJornadaMctDto) {
  const fato = analise.fatos.find((item) =>
    ["ENTRADA_APOS_REFERENCIA", "ENTRADA_TARDIA_COMPENSADA"].includes(
      item.codigo,
    ),
  );

  return Math.max(0, fato?.minutos ?? 0);
}

function montarLinhaTemporal(
  analise: AnaliseJornadaMctDto,
  jornadaPrevista: number,
  tempoFaltante: number,
) {
  const blocos: BlocoLinhaTemporal[] = [];
  let minutosRegularesRestantes = jornadaPrevista;
  let fimAnterior: Date | null = null;
  const atrasoEntrada = minutosAtrasoEntrada(analise);

  if (atrasoEntrada > 0) {
    const inicioReferencia = analise.referencia
      ? new Date(analise.referencia.entrada)
      : undefined;
    const primeiraEntrada = analise.segmentos[0]
      ? new Date(analise.segmentos[0].inicio)
      : undefined;
    blocos.push({
      chave: "atraso-entrada",
      tipo: "atraso",
      minutos: atrasoEntrada,
      inicio: inicioReferencia,
      fim: primeiraEntrada,
    });
  }

  for (const segmento of [...analise.segmentos].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  )) {
    const inicio = new Date(segmento.inicio);
    if (fimAnterior && inicio > fimAnterior) {
      const minutos = Math.round(
        (inicio.getTime() - fimAnterior.getTime()) / 60000,
      );
      if (minutos > 0) {
        adicionarBlocoLinhaTemporal(blocos, {
          chave: `intervalo-${segmento.id}`,
          tipo: "intervalo",
          minutos,
          inicio: fimAnterior,
          fim: inicio,
        });
      }
    }

    const minutosRegulares = Math.min(
      segmento.minutos,
      minutosRegularesRestantes,
    );
    if (minutosRegulares > 0) {
      adicionarBlocoLinhaTemporal(blocos, {
        chave: `regular-${segmento.id}`,
        tipo: "regular",
        minutos: minutosRegulares,
        inicio,
        fim: new Date(inicio.getTime() + minutosRegulares * 60_000),
      });
      minutosRegularesRestantes -= minutosRegulares;
    }
    const minutosExcedentes = segmento.minutos - minutosRegulares;
    if (minutosExcedentes > 0) {
      const inicioExcedente = new Date(
        inicio.getTime() + minutosRegulares * 60_000,
      );
      adicionarBlocoLinhaTemporal(blocos, {
        chave: `excedente-${segmento.id}`,
        tipo: "excedente",
        minutos: minutosExcedentes,
        inicio: inicioExcedente,
        fim: new Date(segmento.fim),
      });
    }
    fimAnterior = new Date(segmento.fim);
  }

  if (tempoFaltante > 0) {
    blocos.push({
      chave: "tempo-faltante",
      tipo: "faltante",
      minutos: tempoFaltante,
    });
  }

  return blocos;
}

function rotuloBloco(tipo: BlocoLinhaTemporal["tipo"]) {
  return {
    atraso: "Atraso",
    regular: "Trabalho regular",
    intervalo: "Intervalo",
    excedente: "Excedente",
    faltante: "Falta cumprir",
  }[tipo];
}

function memoriaBloco(
  bloco: BlocoLinhaTemporal,
  fusoHorario: string | undefined,
  jornadaPrevista: number,
  tempoTrabalhado: number,
) {
  if (bloco.inicio && bloco.fim) {
    return `${horarioReferencia(bloco.fim.toISOString(), fusoHorario)} - ${horarioReferencia(bloco.inicio.toISOString(), fusoHorario)} = ${tempo(bloco.minutos)}`;
  }

  if (bloco.tipo === "faltante") {
    return `${tempo(jornadaPrevista)} - ${tempo(tempoTrabalhado)} = ${tempo(bloco.minutos)}`;
  }

  return tempo(bloco.minutos);
}

function VisaoGeralAnalise({
  analise,
  jornada,
}: {
  analise: AnaliseJornadaMctDto;
  jornada: ResultadoJornada;
}) {
  const prevista = jornada.jornadaExigivelMinutos ?? 0;
  const trabalhada = jornada.tempoEfetivamenteTrabalhadoMinutos ?? 0;
  const computavel = jornada.tempoComputavelMinutos ?? trabalhada;
  const intervalo = jornada.intervalosNaoComputaveisMinutos ?? 0;
  const excedente = jornada.excedenteBrutoMinutos ?? 0;
  const faltante = jornada.tempoFaltanteMinutos ?? 0;
  const atrasoEntrada = minutosAtrasoEntrada(analise);
  const regular = Math.min(trabalhada, prevista);
  const blocosLinha = montarLinhaTemporal(analise, prevista, faltante);
  const totalLinha = Math.max(
    blocosLinha.reduce((total, bloco) => total + bloco.minutos, 0),
    1,
  );
  const cumprimento = percentual(regular, prevista);
  const conformidades = analise.fatos.filter(
    (fato) => fato.categoria === "REGULAR",
  ).length;
  const pendencias = analise.fatos.length - conformidades;

  return (
    <div className="space-y-5">
      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Resumo label="Jornada prevista" valor={tempo(prevista)} />
        <Resumo
          label="Tempo trabalhado"
          valor={tempo(trabalhada)}
          destaque="trabalho"
        />
        <Resumo
          label="Intervalos"
          valor={tempo(intervalo)}
          destaque="intervalo"
        />
        <Resumo
          label="Excedente identificado"
          valor={tempo(excedente)}
          destaque="excedente"
        />
      </dl>

      <section className="flex flex-wrap items-center gap-x-8 gap-y-3 border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock3 className="size-4 text-[var(--primary)]" aria-hidden="true" />
          Horário previsto de referência
        </div>
        {analise.referencia ? (
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">
                Entrada prevista
              </dt>
              <dd className="font-mono font-semibold">
                {horarioReferencia(
                  analise.referencia.entrada,
                  analise.fusoHorario,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">
                Saída prevista
              </dt>
              <dd className="font-mono font-semibold">
                {horarioReferencia(
                  analise.referencia.saida,
                  analise.fusoHorario,
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">
            Esta jornada não possui janela fixa de entrada e saída para o dia.
          </p>
        )}
        <p className="ml-auto text-xs text-[var(--muted-foreground)]">
          Referência usada pelo MCT; não representa marcações realizadas.
        </p>
      </section>

      <section className="border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Eventos utilizados</h3>
          <span className="text-xs text-[var(--muted-foreground)]">
            Marcações consideradas nesta análise
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {analise.eventos.map((evento) => (
            <span
              key={evento.id}
              className="inline-flex items-center gap-2 border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-xs"
              title={`Fonte: ${evento.fonte}`}
            >
              <strong>{evento.tipo}</strong>
              <span className="font-mono font-semibold">
                {horario(evento.ocorridoEm, analise.fusoHorario)}
              </span>
              {evento.duplicadoDe ? (
                <Badge variant="pendente">Duplicado</Badge>
              ) : null}
            </span>
          ))}
          {!analise.eventos.length ? (
            <span className="text-sm text-[var(--muted-foreground)]">
              Nenhum evento utilizado.
            </span>
          ) : null}
        </div>
      </section>

      <section className="border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">
              Linha temporal classificada
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Leitura cronológica do atraso, trabalho, intervalos, excedente e
              tempo ainda necessário para cumprir a jornada.
            </p>
          </div>
          {jornada.permanenciaBrutaMinutos ? (
            <span className="text-xs text-[var(--muted-foreground)]">
              Permanência total: {tempo(jornada.permanenciaBrutaMinutos)}
            </span>
          ) : null}
        </div>
        <div
          className="mt-4 flex h-11 w-full overflow-hidden rounded-sm bg-[var(--muted)]"
          role="img"
          aria-label={`Atraso na entrada ${tempo(atrasoEntrada)}, trabalho regular ${tempo(regular)}, intervalos ${tempo(intervalo)}, excedente ${tempo(excedente)} e falta cumprir ${tempo(faltante)}`}
        >
          {blocosLinha.map((bloco) => (
            <div
              key={bloco.chave}
              className={
                {
                  atraso:
                    "grid place-items-center overflow-hidden bg-rose-600 px-1 text-xs font-semibold text-white",
                  regular:
                    "grid place-items-center overflow-hidden bg-blue-600 px-1 text-xs font-semibold text-white",
                  intervalo:
                    "grid place-items-center overflow-hidden bg-slate-400 px-1 text-xs font-semibold text-white dark:bg-slate-600",
                  excedente:
                    "grid place-items-center overflow-hidden bg-amber-600 px-1 text-xs font-semibold text-white",
                  faltante:
                    "grid place-items-center overflow-hidden border-y border-dashed border-red-400 bg-red-50 px-1 text-xs font-semibold text-red-800 dark:border-red-700 dark:bg-red-950/60 dark:text-red-200",
                }[bloco.tipo]
              }
              style={{ width: `${percentual(bloco.minutos, totalLinha)}%` }}
              title={`${bloco.tipo === "atraso" ? "Atraso na entrada" : bloco.tipo === "regular" ? "Trabalho regular" : bloco.tipo === "intervalo" ? "Intervalo" : bloco.tipo === "excedente" ? "Excedente" : "Falta cumprir"}: ${tempo(bloco.minutos)}`}
            >
              {bloco.minutos >= 30 ? tempo(bloco.minutos) : null}
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-b border-[var(--border)] pb-3 text-[11px] text-[var(--muted-foreground)]">
          {blocosLinha.map((bloco, indice) => (
            <span
              key={`memoria-${bloco.chave}`}
              className="inline-flex min-w-0 items-baseline gap-1"
            >
              <span
                className={
                  {
                    atraso: "size-1.5 shrink-0 bg-rose-600",
                    regular: "size-1.5 shrink-0 bg-blue-600",
                    intervalo:
                      "size-1.5 shrink-0 bg-slate-400 dark:bg-slate-600",
                    excedente: "size-1.5 shrink-0 bg-amber-600",
                    faltante:
                      "size-1.5 shrink-0 border border-dashed border-red-500 bg-red-50 dark:bg-red-950/60",
                  }[bloco.tipo]
                }
                aria-hidden="true"
              />
              <span>
                {rotuloBloco(bloco.tipo)}
                {blocosLinha.filter((item) => item.tipo === bloco.tipo).length >
                1
                  ? ` ${blocosLinha.slice(0, indice + 1).filter((item) => item.tipo === bloco.tipo).length}`
                  : ""}
                :
              </span>
              <strong className="whitespace-nowrap font-mono font-medium text-[var(--foreground)]">
                {memoriaBloco(
                  bloco,
                  analise.fusoHorario,
                  prevista,
                  computavel,
                )}
              </strong>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {atrasoEntrada > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 bg-rose-600" /> Atraso na entrada
              <strong className="font-mono">{tempo(atrasoEntrada)}</strong>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-blue-600" /> Trabalho regular
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-slate-400 dark:bg-slate-600" />{" "}
            Intervalo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-amber-600" /> Excedente
          </span>
          {faltante > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 border border-dashed border-red-500 bg-red-50 dark:bg-red-950/60" />
              Falta cumprir
              <strong className="font-mono">{tempo(faltante)}</strong>
            </span>
          ) : null}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Timer className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold">Relógio de Jornada</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Quanto da obrigação diária foi cumprido
              </p>
            </div>
            <strong className="ml-auto text-lg text-blue-700 dark:text-blue-300">
              {Math.round(cumprimento)}%
            </strong>
          </div>
          <div className="mt-4 h-2 overflow-hidden bg-blue-100 dark:bg-blue-950">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${cumprimento}%` }}
            />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">Meta</dt>
              <dd className="mt-1 font-mono font-semibold">
                {tempo(prevista)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">
                Cumprida
              </dt>
              <dd className="mt-1 font-mono font-semibold">{tempo(regular)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">
                Excedente
              </dt>
              <dd className="mt-1 font-mono font-semibold text-amber-700 dark:text-amber-300">
                {tempo(excedente)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold">Relógio de Conformidade</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Como o dia respeitou horários e regras
              </p>
            </div>
            <Badge
              variant={pendencias > 0 ? "pendente" : "regular"}
              className="ml-auto"
            >
              {pendencias > 0 ? `${pendencias} pendência(s)` : "Sem pendências"}
            </Badge>
          </div>
          <div className="mt-4 space-y-2">
            {analise.fatos.length ? (
              analise.fatos.slice(0, 3).map((fato) => (
                <div key={fato.id} className="flex items-start gap-2 text-sm">
                  {fato.categoria === "REGULAR" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  )}
                  <span className="min-w-0 flex-1">{fato.descricao}</span>
                  {fato.minutos != null ? (
                    <strong className="font-mono">{tempo(fato.minutos)}</strong>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                Nenhuma irregularidade de horário ou intervalo foi identificada.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function AnaliseJornadaDrawer({
  aberto,
  onAbertoChange,
  dataReferencia,
  analise,
  servidorId,
}: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  dataReferencia: string;
  analise?: AnaliseJornadaMctDto;
  servidorId?: string;
}) {
  const [analiseAtual, setAnaliseAtual] = useState(analise);
  const [gerando, iniciarGeracao] = useTransition();
  const aberturaProcessada = useRef(false);
  const jornada = resultadoJornada(analiseAtual?.resultadoJornada);

  const gerarAnalise = useCallback(() => {
    if (!servidorId) return;
    const toastId = toast.show({
      title: "Análise da jornada",
      description: "Gerando análise em modo provisório...",
      variant: "info",
      duration: 100000,
    });
    iniciarGeracao(async () => {
      const resultado = await gerarAnaliseJornadaAction({
        servidorId,
        dataReferencia,
      });
      if (resultado.sucesso && resultado.analise) {
        setAnaliseAtual(resultado.analise);
        toast.update(toastId, {
          title: "Análise concluída",
          description: resultado.mensagem,
          variant: "success",
        });
      } else {
        toast.update(toastId, {
          title: "Não foi possível gerar a análise",
          description: resultado.mensagem,
          variant: "error",
        });
      }
    });
  }, [dataReferencia, servidorId]);

  useEffect(() => {
    if (!aberto) {
      aberturaProcessada.current = false;
      return;
    }

    if (aberturaProcessada.current || !servidorId) return;

    aberturaProcessada.current = true;
    gerarAnalise();
  }, [aberto, gerarAnalise, servidorId]);

  return (
    <Drawer open={aberto} onOpenChange={onAbertoChange}>
      <DrawerContent
        swipeDirection="right"
        className="w-[min(94vw,64rem)] max-w-none"
      >
        <DrawerHeader className="pr-14">
          <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">
            MCT-SECP / Detalhamento diário
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle className="text-xl font-semibold">
              Análise da Jornada
            </DrawerTitle>
            <Badge>
              {analiseAtual?.modo === "SHADOW"
                ? "Provisório"
                : (analiseAtual?.modo ?? "Provisório")}
            </Badge>
            {analiseAtual ? (
              <Badge
                variant={
                  analiseAtual.status === "CONCLUIDA" ? "regular" : "pendente"
                }
              >
                {analiseAtual.status === "CONCLUIDA"
                  ? "Concluída"
                  : "Concluída com pendências"}
              </Badge>
            ) : null}
          </div>
          <DrawerDescription className="mt-1">
            {dataLonga(dataReferencia)}. Resultado explicativo, sem efeito na
            apuração oficial.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!analiseAtual ? (
            <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-[var(--border)] px-6 text-center">
              <Clock3 className="size-8 text-[var(--muted-foreground)]" />
              <h3 className="mt-3 font-semibold">
                Análise ainda não disponível
              </h3>
              <p className="mt-1 max-w-lg text-sm text-[var(--muted-foreground)]">
                Não há execução MCT em modo SHADOW para este dia. Uma nova
                análise está sendo solicitada sem alterar o espelho oficial.
              </p>
              {servidorId ? (
                <Button
                  className="mt-4"
                  loading={gerando}
                  leftIcon={<Activity className="size-4" aria-hidden="true" />}
                  onClick={gerarAnalise}
                >
                  {gerando ? "Gerando análise..." : "Gerar análise"}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <VisaoGeralAnalise analise={analiseAtual} jornada={jornada} />

              <section className="border-l-4 border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--card))] p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Info
                    className="size-4 text-[var(--primary)]"
                    aria-hidden="true"
                  />
                  Entenda o resultado
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  O MCT identificou{" "}
                  {tempo(jornada.tempoEfetivamenteTrabalhadoMinutos)} de
                  trabalho efetivo para uma jornada exigível de{" "}
                  {tempo(jornada.jornadaExigivelMinutos)}.
                  {jornada.excedenteBrutoMinutos
                    ? ` O período de ${tempo(jornada.excedenteBrutoMinutos)} além da jornada foi classificado como excedente.`
                    : " Não houve tempo excedente."}
                  {jornada.excedentePendenteMinutos
                    ? ` Desse total, ${tempo(jornada.excedentePendenteMinutos)} ainda depende das regras e autorizações aplicáveis.`
                    : " Todo o resultado já possui destinação reconhecida."}
                </p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Cumprir a carga horária e estar em conformidade são análises
                  diferentes. Por isso, o Relógio de Jornada e o Relógio de
                  Conformidade são apresentados separadamente.
                </p>
              </section>

              <details className="border border-[var(--border)] bg-[var(--card)]">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold transition hover:bg-[var(--muted)]">
                  Detalhes técnicos da apuração
                </summary>
                <div className="space-y-5 border-t border-[var(--border)] p-4">
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">
                      Rubricas aplicadas
                    </h3>
                    <div className="overflow-x-auto border border-[var(--border)]">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--muted)] text-xs">
                          <tr>
                            <th className="px-3 py-2">Rubrica</th>
                            <th className="px-3 py-2">Dimensão</th>
                            <th className="px-3 py-2">Quantidade</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Destinação</th>
                            <th className="px-3 py-2">Fundamento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {analiseAtual.rubricas.map((rubrica) => (
                            <tr key={rubrica.id}>
                              <td className="px-3 py-2">
                                <span className="font-medium">
                                  {rubrica.codigo}
                                </span>
                                <span className="block text-xs text-[var(--muted-foreground)]">
                                  {rubrica.nome}
                                </span>
                              </td>
                              <td className="px-3 py-2">{rubrica.dimensao}</td>
                              <td className="px-3 py-2 font-mono">
                                {rubrica.quantidade}
                              </td>
                              <td className="px-3 py-2">{rubrica.status}</td>
                              <td className="px-3 py-2">
                                {rubrica.destinacao ?? "Sem destinação"}
                              </td>
                              <td className="px-3 py-2 text-[var(--muted-foreground)]">
                                {rubrica.fundamentoNormativo ?? "Não informado"}
                              </td>
                            </tr>
                          ))}
                          {!analiseAtual.rubricas.length ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-3 py-5 text-center text-[var(--muted-foreground)]"
                              >
                                Nenhuma rubrica aplicada.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">
                        Comparação com o legado
                      </h3>
                      <div className="border border-[var(--border)] p-3 text-sm">
                        {analiseAtual.comparacaoLegado ? (
                          <>
                            <p className="font-medium">
                              {analiseAtual.comparacaoLegado.totalDivergencias}{" "}
                              divergência(s)
                            </p>
                            <p className="mt-1 text-[var(--muted-foreground)]">
                              {analiseAtual.comparacaoLegado
                                .possuiDivergenciaCritica
                                ? "Há divergência crítica para diagnóstico."
                                : "Sem divergência crítica."}
                            </p>
                          </>
                        ) : (
                          <p className="text-[var(--muted-foreground)]">
                            Comparação ainda não executada.
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Auditoria</h3>
                      <dl className="border border-[var(--border)] p-3 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-[var(--muted-foreground)]">
                            Política
                          </dt>
                          <dd>
                            {analiseAtual.politica.codigo} v
                            {analiseAtual.politica.versao}
                          </dd>
                        </div>
                        <div className="mt-2 flex justify-between gap-4">
                          <dt className="text-[var(--muted-foreground)]">
                            Motor
                          </dt>
                          <dd>{analiseAtual.versaoMotor}</dd>
                        </div>
                        <div className="mt-2 flex justify-between gap-4">
                          <dt className="text-[var(--muted-foreground)]">
                            Execução
                          </dt>
                          <dd
                            className="truncate font-mono text-xs"
                            title={analiseAtual.execucaoId}
                          >
                            {analiseAtual.execucaoId}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold">
                      Histórico de execuções
                    </h3>
                    <div className="divide-y divide-[var(--border)] border border-[var(--border)] text-sm">
                      <div className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_8rem_8rem]">
                        <span className="font-mono text-xs">
                          {analiseAtual.execucaoId}
                        </span>
                        <span>{analiseAtual.status}</span>
                        <span>Motor {analiseAtual.versaoMotor}</span>
                      </div>
                      {analiseAtual.historico.map((item) => (
                        <div
                          key={item.execucaoId}
                          className="grid gap-2 px-3 py-2 text-[var(--muted-foreground)] sm:grid-cols-[1fr_8rem_8rem]"
                        >
                          <span className="font-mono text-xs">
                            {item.execucaoId}
                          </span>
                          <span>{item.status}</span>
                          <span>Motor {item.versaoMotor}</span>
                        </div>
                      ))}
                      {!analiseAtual.historico.length ? (
                        <p className="px-3 py-2 text-[var(--muted-foreground)]">
                          Sem reprocessamentos anteriores.
                        </p>
                      ) : null}
                    </div>
                  </section>
                </div>
              </details>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function AnaliseJornadaMenuButton({
  dataReferencia,
  analise,
  servidorId,
}: {
  dataReferencia: string;
  analise?: AnaliseJornadaMctDto;
  servidorId?: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ml-auto inline-flex size-8 items-center justify-center rounded-md transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label="Abrir análise da jornada"
        title="Análise da jornada"
        onClick={() => setAberto(true)}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>
      <AnaliseJornadaDrawer
        aberto={aberto}
        onAbertoChange={setAberto}
        dataReferencia={dataReferencia}
        analise={analise}
        servidorId={servidorId}
      />
    </>
  );
}
