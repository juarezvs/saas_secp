"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { criarSolicitacaoHorasExtrasAction } from "../../application/actions/criar-solicitacao-horas-extras.action";
import type { CriarSolicitacaoHorasExtrasFormState } from "../../application/schemas/horas-extras-solicitacao.schema";
import type {
  OvertimeDayType,
  OvertimePaymentDestination,
} from "../../domain/horas-extras.types";

type DiaSolicitado = {
  date: string;
  requestedTime: string;
  paymentDestination: Exclude<OvertimePaymentDestination, "A_DEFINIR">;
};

type DiaPeriodo = DiaSolicitado & {
  rotulo: string;
  semana: string;
  dayType: OvertimeDayType;
  limitMinutes?: number;
};

type HorasExtrasSolicitacaoFormProps = {
  limitesPorTipoDia?: Partial<Record<OvertimeDayType, number>>;
  valoresIniciais?: {
    requestId?: string;
    periodStart?: string;
    periodEnd?: string;
    justification?: string;
    activitiesDescription?: string;
    days?: DiaSolicitado[];
  };
};

const estadoInicial: CriarSolicitacaoHorasExtrasFormState = {
  sucesso: false,
};

const etapas = ["Período", "Dias e destino", "Revisão"];

const rotulosTipoDia: Record<OvertimeDayType, string> = {
  DIA_UTIL: "Dia útil",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
  FERIADO_NACIONAL: "Feriado nacional",
  FERIADO_ESTADUAL: "Feriado estadual",
  FERIADO_MUNICIPAL: "Feriado municipal",
  FERIADO_REGIMENTAL: "Feriado regimental",
  PONTO_FACULTATIVO: "Ponto facultativo",
  RECESSO: "Recesso",
  FOLGA_DE_ESCALA: "Folga de escala",
};

function erro(estado: CriarSolicitacaoHorasExtrasFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function valorCampo(
  estado: CriarSolicitacaoHorasExtrasFormState,
  campo: "periodStart" | "periodEnd" | "justification" | "activitiesDescription",
  fallback = "",
) {
  const valor = estado.campos?.[campo];
  return typeof valor === "string" ? valor : fallback;
}

function criarDataUtc(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function adicionarDias(data: Date, dias: number) {
  const proxima = new Date(data);
  proxima.setUTCDate(proxima.getUTCDate() + dias);
  return proxima;
}

function formatarDia(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
}

function formatarDataIso(data: string) {
  return formatarDia(criarDataUtc(data));
}

function formatarSemana(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(data);
}

function inferirTipoDia(data: Date): OvertimeDayType {
  const diaSemana = data.getUTCDay();

  if (diaSemana === 0) return "DOMINGO";
  if (diaSemana === 6) return "SABADO";

  return "DIA_UTIL";
}

function minutosDeHoraMinuto(valor: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(valor);

  if (!match) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function mascararHoraMinuto(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 4);

  if (digitos.length <= 2) {
    return digitos;
  }

  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

function normalizarHoraMinutoParcial(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 4);

  if (!digitos) {
    return "00:00";
  }

  if (digitos.length <= 2) {
    return `${digitos.padStart(2, "0")}:00`;
  }

  if (digitos.length === 3) {
    return `${digitos.slice(0, 2)}:${digitos.slice(2).padEnd(2, "0")}`;
  }

  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

function gerarDiasPeriodo(
  periodStart: string,
  periodEnd: string,
  diasSolicitados: DiaSolicitado[],
  limitesPorTipoDia: HorasExtrasSolicitacaoFormProps["limitesPorTipoDia"],
) {
  if (!periodStart || !periodEnd || periodStart > periodEnd) {
    return [];
  }

  const porData = new Map(diasSolicitados.map((dia) => [dia.date, dia]));
  const dias: DiaPeriodo[] = [];
  const inicio = criarDataUtc(periodStart);
  const fim = criarDataUtc(periodEnd);

  for (let cursor = inicio; cursor <= fim; cursor = adicionarDias(cursor, 1)) {
    const date = cursor.toISOString().slice(0, 10);
    const existente = porData.get(date);
    const dayType = inferirTipoDia(cursor);

    dias.push({
      date,
      rotulo: formatarDia(cursor),
      semana: formatarSemana(cursor),
      dayType,
      limitMinutes: limitesPorTipoDia?.[dayType],
      requestedTime: existente?.requestedTime ?? "00:00",
      paymentDestination: existente?.paymentDestination ?? "PECUNIA",
    });
  }

  return dias;
}

function diasValidosParaEnvio(dias: DiaPeriodo[]) {
  return dias
    .filter((dia) => minutosDeHoraMinuto(dia.requestedTime) > 0)
    .map((dia) => ({
      date: dia.date,
      requestedTime: dia.requestedTime,
      paymentDestination: dia.paymentDestination,
    }));
}

function destinoTexto(destino: DiaSolicitado["paymentDestination"]) {
  return destino === "BANCO_DE_HORAS" ? "Banco de horas" : "Pecúnia";
}

export function HorasExtrasSolicitacaoForm({
  limitesPorTipoDia,
  valoresIniciais,
}: HorasExtrasSolicitacaoFormProps) {
  const [estado, formAction, pendente] = useActionState(
    criarSolicitacaoHorasExtrasAction,
    estadoInicial,
  );
  const requestId =
    typeof estado.campos?.requestId === "string"
      ? estado.campos.requestId
      : valoresIniciais?.requestId ?? "";
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [periodStart, setPeriodStart] = useState(
    valorCampo(estado, "periodStart", valoresIniciais?.periodStart ?? hojeIso()),
  );
  const [periodEnd, setPeriodEnd] = useState(
    valorCampo(estado, "periodEnd", valoresIniciais?.periodEnd ?? hojeIso()),
  );
  const [justification, setJustification] = useState(
    valorCampo(estado, "justification", valoresIniciais?.justification ?? ""),
  );
  const [activitiesDescription, setActivitiesDescription] = useState(
    valorCampo(
      estado,
      "activitiesDescription",
      valoresIniciais?.activitiesDescription ?? "",
    ),
  );
  const [tentouAvancarDias, setTentouAvancarDias] = useState(false);
  const [diasSolicitados, setDiasSolicitados] = useState<DiaSolicitado[]>(
    () =>
      estado.campos?.days?.map((dia) => ({
        date: dia.date,
        requestedTime:
          "requestedTime" in dia && typeof dia.requestedTime === "string"
            ? dia.requestedTime
            : formatarMinutos(dia.requestedMinutes ?? 0),
        paymentDestination:
          dia.paymentDestination === "BANCO_DE_HORAS"
            ? "BANCO_DE_HORAS"
            : "PECUNIA",
      })) ??
      valoresIniciais?.days ??
      [],
  );

  const periodoValido = Boolean(periodStart && periodEnd && periodStart <= periodEnd);
  const diasPeriodo = useMemo(
    () =>
      gerarDiasPeriodo(
        periodStart,
        periodEnd,
        diasSolicitados,
        limitesPorTipoDia,
      ),
    [periodStart, periodEnd, diasSolicitados, limitesPorTipoDia],
  );
  const diasParaEnvio = useMemo(
    () => diasValidosParaEnvio(diasPeriodo),
    [diasPeriodo],
  );
  const totalMinutos = diasParaEnvio.reduce(
    (total, dia) => total + minutosDeHoraMinuto(dia.requestedTime),
    0,
  );
  const linhasComErro = diasPeriodo.filter((dia) => {
    const minutos = minutosDeHoraMinuto(dia.requestedTime);
    return dia.limitMinutes !== undefined && minutos > dia.limitMinutes;
  });
  const podeAvancarDados =
    periodoValido &&
    justification.trim().length >= 10 &&
    activitiesDescription.trim().length >= 10;
  const podeEnviar =
    podeAvancarDados && diasParaEnvio.length > 0 && linhasComErro.length === 0;

  function atualizarDia(
    date: string,
    patch: Partial<Pick<DiaSolicitado, "requestedTime" | "paymentDestination">>,
  ) {
    setDiasSolicitados((atual) => {
      const existentes = new Map(atual.map((dia) => [dia.date, dia]));
      const anterior = existentes.get(date) ?? {
        date,
        requestedTime: "00:00",
        paymentDestination: "PECUNIA" as const,
      };

      existentes.set(date, { ...anterior, ...patch });

      return Array.from(existentes.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    });
  }

  function avancarEtapa() {
    if (etapaAtual === 0) {
      if (podeAvancarDados) {
        setEtapaAtual(1);
      }

      return;
    }

    if (etapaAtual === 1) {
      setTentouAvancarDias(true);

      if (podeEnviar) {
        setEtapaAtual(2);
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {requestId ? "Continuar rascunho" : "Solicitação de horas extras"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input
            type="hidden"
            name="days"
            value={JSON.stringify(diasParaEnvio)}
          />
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="periodStart" value={periodStart} />
          <input type="hidden" name="periodEnd" value={periodEnd} />
          <input type="hidden" name="justification" value={justification} />
          <input
            type="hidden"
            name="activitiesDescription"
            value={activitiesDescription}
          />

          <div className="grid gap-3 md:grid-cols-3">
            {etapas.map((etapa, index) => {
              const ativa = etapaAtual === index;
              const concluida = etapaAtual > index;

              return (
                <button
                  key={etapa}
                  type="button"
                  onClick={() => {
                    if (index === 0 || podeAvancarDados) {
                      setEtapaAtual(index);
                    }
                  }}
                  className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left transition ${
                    ativa
                      ? "border-blue-800 bg-blue-50 text-blue-950 dark:border-blue-300 dark:bg-blue-950 dark:text-blue-50"
                      : concluida
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-300 dark:bg-emerald-950 dark:text-emerald-50"
                        : "bg-[var(--card)] text-[var(--muted-foreground)]"
                  }`}
                >
                  <span
                    className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                      concluida
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : ativa
                          ? "border-blue-800 bg-blue-800 text-white"
                          : "border-[var(--border)]"
                    }`}
                  >
                    {concluida ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span className="text-sm font-semibold">{etapa}</span>
                </button>
              );
            })}
          </div>

          {estado.mensagem && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              {estado.mensagem}
            </div>
          )}

          {etapaAtual === 0 && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="periodStart">Início</Label>
                  <Input
                    id="periodStart"
                    name="periodStart"
                    type="date"
                    value={periodStart}
                    onChange={(event) => setPeriodStart(event.target.value)}
                    aria-invalid={Boolean(erro(estado, "periodStart"))}
                  />
                  {erro(estado, "periodStart") && (
                    <p className="text-xs text-red-700">
                      {erro(estado, "periodStart")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">Fim</Label>
                  <Input
                    id="periodEnd"
                    name="periodEnd"
                    type="date"
                    value={periodEnd}
                    onChange={(event) => setPeriodEnd(event.target.value)}
                    aria-invalid={Boolean(erro(estado, "periodEnd"))}
                  />
                  {erro(estado, "periodEnd") && (
                    <p className="text-xs text-red-700">
                      {erro(estado, "periodEnd")}
                    </p>
                  )}
                </div>
              </div>

              {!periodoValido && (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Informe um período válido para montar os dias da solicitação.
                </p>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="justification">Justificativa</Label>
                  <Textarea
                    id="justification"
                    name="justification"
                    value={justification}
                    onChange={(event) => setJustification(event.target.value)}
                    aria-invalid={Boolean(erro(estado, "justification"))}
                  />
                  {erro(estado, "justification") && (
                    <p className="text-xs text-red-700">
                      {erro(estado, "justification")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activitiesDescription">
                    Atividades previstas
                  </Label>
                  <Textarea
                    id="activitiesDescription"
                    name="activitiesDescription"
                    value={activitiesDescription}
                    onChange={(event) =>
                      setActivitiesDescription(event.target.value)
                    }
                    aria-invalid={Boolean(erro(estado, "activitiesDescription"))}
                  />
                  {erro(estado, "activitiesDescription") && (
                    <p className="text-xs text-red-700">
                      {erro(estado, "activitiesDescription")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {etapaAtual === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-bold">Dias do período</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Informe o tempo em HH:mm. Dias com 00:00 não serão enviados.
                  </p>
                </div>
                <div className="rounded-md border bg-[var(--muted)] px-3 py-2 text-sm font-semibold">
                  {diasParaEnvio.length} dia(s), {formatarMinutos(totalMinutos)}
                </div>
              </div>

              {erro(estado, "days") && (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {erro(estado, "days")}
                </p>
              )}

              {tentouAvancarDias && linhasComErro.length > 0 && (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Revise os dias destacados: há tempo informado acima do limite
                  diário permitido.
                </p>
              )}

              <div className="overflow-hidden rounded-lg border">
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="sticky top-0 border-b bg-[var(--card)] text-xs uppercase text-[var(--muted-foreground)]">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Dia</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Limite</th>
                        <th className="px-4 py-3">Tempo</th>
                        <th className="px-4 py-3">Destino</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diasPeriodo.map((dia) => {
                        const minutos = minutosDeHoraMinuto(dia.requestedTime);
                        const excedeu =
                          dia.limitMinutes !== undefined &&
                          minutos > dia.limitMinutes;
                        const preenchido = minutos > 0;

                        return (
                          <tr
                            key={dia.date}
                            className={`border-b last:border-b-0 ${
                              preenchido
                                ? "border-l-4 border-l-blue-900 bg-blue-50/70 dark:border-l-blue-300 dark:bg-blue-950/40"
                                : "border-l-4 border-l-transparent"
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold">
                              {dia.rotulo}
                            </td>
                            <td className="px-4 py-3 capitalize text-[var(--muted-foreground)]">
                              {dia.semana}
                            </td>
                            <td className="px-4 py-3">
                              {rotulosTipoDia[dia.dayType]}
                            </td>
                            <td className="px-4 py-3">
                              {dia.limitMinutes !== undefined
                                ? formatarMinutos(dia.limitMinutes)
                                : "Política"}
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                inputMode="numeric"
                                maxLength={5}
                                value={dia.requestedTime}
                                onFocus={(event) => event.currentTarget.select()}
                                onChange={(event) =>
                                  atualizarDia(dia.date, {
                                    requestedTime: mascararHoraMinuto(
                                      event.target.value,
                                    ),
                                  })
                                }
                                onBlur={(event) => {
                                  atualizarDia(dia.date, {
                                    requestedTime: normalizarHoraMinutoParcial(
                                      event.target.value,
                                    ),
                                  });
                                }}
                                aria-invalid={excedeu}
                                className={`w-24 ${
                                  excedeu
                                    ? "border-red-500 focus-visible:outline-red-600"
                                    : ""
                                }`}
                              />
                              {excedeu && (
                                <p className="mt-1 text-xs text-red-700">
                                  Acima do limite do dia.
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  atualizarDia(dia.date, {
                                    paymentDestination:
                                      dia.paymentDestination === "BANCO_DE_HORAS"
                                        ? "PECUNIA"
                                        : "BANCO_DE_HORAS",
                                  })
                                }
                                className="relative inline-grid h-9 w-40 grid-cols-2 items-center overflow-hidden rounded-full border bg-[var(--muted)] p-1 text-xs font-bold transition"
                                aria-label={`Alternar destino da data ${dia.rotulo}`}
                                aria-pressed={
                                  dia.paymentDestination === "BANCO_DE_HORAS"
                                }
                              >
                                <span
                                  className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-300 ease-out ${
                                    dia.paymentDestination === "BANCO_DE_HORAS"
                                      ? "translate-x-full bg-emerald-600"
                                      : "translate-x-0 bg-blue-900"
                                  }`}
                                  aria-hidden="true"
                                />
                                <span
                                  className={`relative z-10 text-center transition-colors duration-300 ${
                                    dia.paymentDestination === "BANCO_DE_HORAS"
                                      ? "text-[var(--muted-foreground)]"
                                      : "text-white"
                                  }`}
                                >
                                  Pecúnia
                                </span>
                                <span
                                  className={`relative z-10 text-center transition-colors duration-300 ${
                                    dia.paymentDestination === "BANCO_DE_HORAS"
                                      ? "text-white"
                                      : "text-[var(--muted-foreground)]"
                                  }`}
                                >
                                  Banco
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {etapaAtual === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-[var(--muted)] p-4">
                <h3 className="font-bold">Resumo da solicitação</h3>
                <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <dt className="text-[var(--muted-foreground)]">Período</dt>
                    <dd className="font-semibold">
                      {formatarDataIso(periodStart)} a {formatarDataIso(periodEnd)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted-foreground)]">Dias</dt>
                    <dd className="font-semibold">{diasParaEnvio.length}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted-foreground)]">Tempo total</dt>
                    <dd className="font-semibold">{formatarMinutos(totalMinutos)}</dd>
                  </div>
                </dl>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b bg-[var(--card)] text-xs uppercase text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Tempo</th>
                      <th className="px-4 py-3">Destino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diasParaEnvio.map((dia) => (
                      <tr key={dia.date} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-semibold">
                          {formatarDataIso(dia.date)}
                        </td>
                        <td className="px-4 py-3">{dia.requestedTime}</td>
                        <td className="px-4 py-3">
                          {destinoTexto(dia.paymentDestination)}
                        </td>
                      </tr>
                    ))}
                    {diasParaEnvio.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-[var(--muted-foreground)]"
                        >
                          Nenhum dia com hora extra informado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={etapaAtual === 0}
                onClick={() => setEtapaAtual((atual) => Math.max(atual - 1, 0))}
              >
                <ChevronLeft className="size-4" />
                Voltar
              </Button>
              {etapaAtual < 2 && (
                <Button
                  type="button"
                  disabled={
                    etapaAtual === 0
                      ? !podeAvancarDados
                      : diasParaEnvio.length === 0
                  }
                  onClick={avancarEtapa}
                >
                  Avançar
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                href="/horas-extras"
                className="inline-flex h-10 items-center justify-center gap-2.5 rounded-md border border-border bg-transparent px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Cancelar
              </Link>
              {etapaAtual === 2 && (
                <>
                  <Button
                    type="submit"
                    name="intent"
                    value="draft"
                    variant="outline"
                    disabled={!podeEnviar || pendente}
                  >
                    {pendente ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Salvar rascunho
                  </Button>
                  <Button
                    type="submit"
                    name="intent"
                    value="submit"
                    disabled={!podeEnviar || pendente}
                  >
                    {pendente ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Enviar solicitação
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
