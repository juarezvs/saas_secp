import type { DiaSemana } from "@/generated/prisma/client";

type FaixaHorario = {
  tipo: string;
  horaInicio: string;
  horaFim: string;
  cruzaMeiaNoite: boolean;
  ordem: number;
};

type DiaJornada = {
  diaSemana: DiaSemana | string | null;
  ordemNoCiclo: number | null;
  tipoDia: string;
  cargaPrevistaMinutos: number;
  faixas: FaixaHorario[];
};

type DiaEscala = {
  diaSemana: DiaSemana | null;
  posicaoCiclo: number | null;
  tipoDia: string;
  trabalha: boolean;
  horarioEntrada: string | null;
  horarioSaida: string | null;
  intervaloInicio: string | null;
  intervaloFim: string | null;
  cargaPrevistaMinutos: number;
  cruzaMeiaNoite: boolean;
};

type EscalaJornada = {
  tipo: string;
  quantidadeDiasCiclo: number | null;
  dataAncoragem: Date | null;
  primeiroDiaTrabalho: Date | null;
  dias: DiaEscala[];
};

type JornadaConfigurada = {
  tipo: string;
  cargaDiariaMinutos: number;
  horarioEntradaPadrao: string | null;
  horarioSaidaPadrao: string | null;
  cruzaMeiaNoite: boolean;
  controlaHorario: boolean;
  dias: DiaJornada[];
};

export type PrevisaoJornadaDia = {
  fonte: "ESCALA" | "JORNADA_DIA" | "JORNADA_PADRAO";
  tipoDia: string;
  trabalha: boolean;
  cargaPrevistaMinutos: number;
  faixas: FaixaHorario[];
  janela: {
    inicio: string;
    fim: string;
    cruzaMeiaNoite: boolean;
  } | null;
  escalaPosicaoCiclo: number | null;
  diaSemana: DiaSemana;
};

const DIA_SEMANA_POR_INDICE: DiaSemana[] = [
  "DOMINGO",
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
];

function normalizarData(data: Date) {
  const normalizada = new Date(data);
  normalizada.setUTCHours(0, 0, 0, 0);
  return normalizada;
}

function diaSemanaData(data: Date): DiaSemana {
  return DIA_SEMANA_POR_INDICE[normalizarData(data).getUTCDay()];
}

function diasEntre(inicio: Date, fim: Date) {
  const inicioNormalizado = normalizarData(inicio).getTime();
  const fimNormalizado = normalizarData(fim).getTime();
  return Math.floor((fimNormalizado - inicioNormalizado) / 86_400_000);
}

function resolverPosicaoCiclo(escala: EscalaJornada, dataReferencia: Date) {
  const tamanho = escala.quantidadeDiasCiclo ?? escala.dias.length;
  const ancoragem = escala.dataAncoragem ?? escala.primeiroDiaTrabalho;

  if (!tamanho || !ancoragem) return null;

  const diferenca = diasEntre(ancoragem, dataReferencia);
  return ((diferenca % tamanho) + tamanho) % tamanho + 1;
}

function diaTrabalha(tipoDia: string, trabalha = true) {
  return (
    trabalha &&
    !["FOLGA", "SEM_EXPEDIENTE", "HOME_OFFICE"].includes(tipoDia)
  );
}

function previsaoPorEscala(
  escala: EscalaJornada,
  dataReferencia: Date,
): PrevisaoJornadaDia | null {
  const diaSemana = diaSemanaData(dataReferencia);
  const posicaoCiclo = resolverPosicaoCiclo(escala, dataReferencia);
  const dia =
    posicaoCiclo !== null
      ? escala.dias.find((item) => item.posicaoCiclo === posicaoCiclo)
      : escala.dias.find((item) => item.diaSemana === diaSemana);

  if (!dia) return null;

  const trabalha = diaTrabalha(dia.tipoDia, dia.trabalha);

  return {
    fonte: "ESCALA",
    tipoDia: dia.tipoDia,
    trabalha,
    cargaPrevistaMinutos: trabalha ? dia.cargaPrevistaMinutos : 0,
    janela:
      trabalha && dia.horarioEntrada && dia.horarioSaida
        ? {
            inicio: dia.horarioEntrada,
            fim: dia.horarioSaida,
            cruzaMeiaNoite: dia.cruzaMeiaNoite,
          }
        : null,
    escalaPosicaoCiclo: dia.posicaoCiclo ?? posicaoCiclo,
    diaSemana,
    faixas:
      trabalha && dia.horarioEntrada && dia.horarioSaida
        ? [
            {
              tipo: "TRABALHO",
              horaInicio: dia.horarioEntrada,
              horaFim: dia.horarioSaida,
              cruzaMeiaNoite: dia.cruzaMeiaNoite,
              ordem: 1,
            },
          ]
        : [],
  };
}

function previsaoPorJornadaDia(
  jornada: JornadaConfigurada,
  dataReferencia: Date,
  dataAncoragemCiclo?: Date | null,
): PrevisaoJornadaDia | null {
  const diaSemana = diaSemanaData(dataReferencia);
  const diasCiclo = jornada.dias
    .filter((item) => item.ordemNoCiclo)
    .sort((a, b) => Number(a.ordemNoCiclo ?? 0) - Number(b.ordemNoCiclo ?? 0));
  const tamanhoCiclo =
    jornada.tipo === "ESCALA_CICLICA" && diasCiclo.length > 0
      ? Math.max(...diasCiclo.map((item) => Number(item.ordemNoCiclo ?? 0)))
      : 0;
  const posicaoCiclo =
    tamanhoCiclo > 0 && dataAncoragemCiclo
      ? ((diasEntre(dataAncoragemCiclo, dataReferencia) % tamanhoCiclo) +
          tamanhoCiclo) %
          tamanhoCiclo +
        1
      : null;
  const dia =
    posicaoCiclo !== null
      ? diasCiclo.find((item) => item.ordemNoCiclo === posicaoCiclo)
      : jornada.dias.find((item) => item.diaSemana === diaSemana);

  if (!dia) return null;

  const trabalha = diaTrabalha(dia.tipoDia);
  const faixasTrabalho = dia.faixas
    .filter((faixa) => faixa.tipo === "TRABALHO")
    .sort((a, b) => a.ordem - b.ordem);
  const faixaTrabalho = faixasTrabalho[0];

  return {
    fonte: "JORNADA_DIA",
    tipoDia: dia.tipoDia,
    trabalha,
    cargaPrevistaMinutos: trabalha ? dia.cargaPrevistaMinutos : 0,
    janela:
      trabalha && faixaTrabalho
        ? {
            inicio: faixaTrabalho.horaInicio,
            fim: faixaTrabalho.horaFim,
            cruzaMeiaNoite: faixaTrabalho.cruzaMeiaNoite,
          }
        : null,
    escalaPosicaoCiclo: dia.ordemNoCiclo,
    diaSemana,
    faixas: trabalha ? faixasTrabalho : [],
  };
}

export function resolverPrevisaoJornadaDia(params: {
  jornada: JornadaConfigurada;
  escala?: EscalaJornada | null;
  dataReferencia: Date;
  dataAncoragemJornada?: Date | null;
}): PrevisaoJornadaDia {
  const diaSemana = diaSemanaData(params.dataReferencia);
  const porEscala = params.escala
    ? previsaoPorEscala(params.escala, params.dataReferencia)
    : null;
  const porJornada = previsaoPorJornadaDia(
    params.jornada,
    params.dataReferencia,
    params.dataAncoragemJornada ?? null,
  );

  if (porEscala) return porEscala;
  if (porJornada) return porJornada;

  if (params.jornada.tipo === "TELETRABALHO") {
    return {
      fonte: "JORNADA_PADRAO",
      tipoDia: "TELETRABALHO",
      trabalha: true,
      cargaPrevistaMinutos: params.jornada.cargaDiariaMinutos,
      janela:
        params.jornada.horarioEntradaPadrao &&
        params.jornada.horarioSaidaPadrao
          ? {
              inicio: params.jornada.horarioEntradaPadrao,
              fim: params.jornada.horarioSaidaPadrao,
              cruzaMeiaNoite: params.jornada.cruzaMeiaNoite,
            }
          : null,
      escalaPosicaoCiclo: null,
      diaSemana,
      faixas: [],
    };
  }

  return {
    fonte: "JORNADA_PADRAO",
    tipoDia: params.jornada.controlaHorario
      ? "TRABALHO"
      : "SEM_CONTROLE_CONVENCIONAL",
    trabalha: params.jornada.controlaHorario,
    cargaPrevistaMinutos: params.jornada.controlaHorario
      ? params.jornada.cargaDiariaMinutos
      : 0,
    janela:
      params.jornada.controlaHorario &&
      params.jornada.horarioEntradaPadrao &&
      params.jornada.horarioSaidaPadrao
        ? {
            inicio: params.jornada.horarioEntradaPadrao,
            fim: params.jornada.horarioSaidaPadrao,
            cruzaMeiaNoite: params.jornada.cruzaMeiaNoite,
          }
        : null,
    escalaPosicaoCiclo: null,
    diaSemana,
    faixas: [],
  };
}
