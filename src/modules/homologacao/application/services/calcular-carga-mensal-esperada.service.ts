import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { calcularCargaPrevistaComJanela } from "@/modules/apuracao/application/services/expediente.service";
import {
  carregarCalendarioInstitucionalPeriodo,
  classificarDiaInstitucional,
  type CalendarioInstitucionalPrecarregado,
} from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";

type JornadaMensal = {
  id: string;
  dataInicio: Date;
  dataFim: Date | null;
  jornada: {
    cargaDiariaMinutos: number;
  };
};

export type DiaCargaMensalEsperada = {
  dataReferencia: Date;
  jornadaServidorId: string;
  cargaPrevistaMinutos: number;
};

export type ResultadoCargaMensalEsperada = {
  dias: DiaCargaMensalEsperada[];
  diasUteisSemJornada: Date[];
  diasUteis: number;
  cargaPrevistaMinutos: number;
};

function inicioCompetencia(anoReferencia: number, mesReferencia: number) {
  return new Date(Date.UTC(anoReferencia, mesReferencia - 1, 1));
}

function fimCompetencia(anoReferencia: number, mesReferencia: number) {
  return new Date(Date.UTC(anoReferencia, mesReferencia, 1));
}

function chaveData(data: Date) {
  return normalizarDataReferencia(data).toISOString().slice(0, 10);
}

function jornadaVigenteNoDia(jornadas: JornadaMensal[], dataReferencia: Date) {
  const dataNormalizada = normalizarDataReferencia(dataReferencia);

  return jornadas
    .filter((jornada) => {
      const inicio = normalizarDataReferencia(jornada.dataInicio);
      const fim = jornada.dataFim
        ? normalizarDataReferencia(jornada.dataFim)
        : null;

      return inicio <= dataNormalizada && (!fim || fim >= dataNormalizada);
    })
    .sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime())[0];
}

export async function calcularCargaMensalEsperada(params: {
  anoReferencia: number;
  mesReferencia: number;
  jornadas: JornadaMensal[];
  calendario?: CalendarioInstitucionalPrecarregado;
}): Promise<ResultadoCargaMensalEsperada> {
  const inicio = inicioCompetencia(params.anoReferencia, params.mesReferencia);
  const fim = fimCompetencia(params.anoReferencia, params.mesReferencia);
  const calendario =
    params.calendario ??
    (await carregarCalendarioInstitucionalPeriodo({
      inicio,
      fimExclusivo: fim,
    }));
  const dias: DiaCargaMensalEsperada[] = [];
  const diasUteisSemJornada: Date[] = [];
  const datasCalculadas = new Set<string>();
  const cursor = new Date(inicio);

  while (cursor < fim) {
    const dataReferencia = normalizarDataReferencia(cursor);
    const classificacao = await classificarDiaInstitucional(
      dataReferencia,
      calendario,
    );

    if (classificacao.contaComoDiaUtil && classificacao.geraApuracaoRegular) {
      const jornada = jornadaVigenteNoDia(params.jornadas, dataReferencia);

      if (jornada) {
        const chave = chaveData(dataReferencia);

        if (!datasCalculadas.has(chave)) {
          dias.push({
            dataReferencia,
            jornadaServidorId: jornada.id,
            cargaPrevistaMinutos: calcularCargaPrevistaComJanela(
              jornada.jornada.cargaDiariaMinutos,
              classificacao.janelaInicio && classificacao.janelaFim
                ? {
                    inicio: classificacao.janelaInicio,
                    fim: classificacao.janelaFim,
                  }
                : null,
            ),
          });
          datasCalculadas.add(chave);
        }
      } else {
        diasUteisSemJornada.push(dataReferencia);
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    dias,
    diasUteisSemJornada,
    diasUteis: dias.length + diasUteisSemJornada.length,
    cargaPrevistaMinutos: dias.reduce(
      (total, dia) => total + dia.cargaPrevistaMinutos,
      0,
    ),
  };
}
