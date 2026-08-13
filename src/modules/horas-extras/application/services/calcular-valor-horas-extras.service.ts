import {
  segmentarHorasExtrasPorVigenciaRemuneratoria,
  type VigenciaRemuneratoriaHoraExtra,
} from "./segmentar-remuneracao-horas-extras.service";

export type HoraExtraReconhecidaFinanceira = {
  data: string;
  minutos: number;
  tipoDia: string;
};

export type RegraFinanceiraHoraExtra = {
  tipoDia: string;
  percentual: number;
  rubrica?: string;
};

export type ItemCalculoFinanceiroHoraExtra = {
  data: string;
  minutos: number;
  tipoDia: string;
  vigenciaRemuneratoriaId: string;
  remuneracaoBaseCentavos: number;
  divisorMinutos: number;
  percentual: number;
  rubrica?: string;
  valorCentavos: number;
};

export type ResultadoCalculoFinanceiroHoraExtra = {
  itens: ItemCalculoFinanceiroHoraExtra[];
  totalCentavos: number;
};

function arredondarCentavos(valor: number) {
  return Math.round(valor);
}

export function calcularValorHorasExtras(params: {
  horasReconhecidas: HoraExtraReconhecidaFinanceira[];
  vigenciasRemuneratorias: VigenciaRemuneratoriaHoraExtra[];
  regrasFinanceiras: RegraFinanceiraHoraExtra[];
  divisorMinutos: number;
}): ResultadoCalculoFinanceiroHoraExtra {
  if (params.divisorMinutos <= 0) {
    throw new Error("Divisor financeiro deve ser maior que zero.");
  }

  const regrasPorTipoDia = new Map(
    params.regrasFinanceiras.map((regra) => [regra.tipoDia, regra]),
  );
  const blocos = segmentarHorasExtrasPorVigenciaRemuneratoria({
    horasReconhecidas: params.horasReconhecidas,
    vigencias: params.vigenciasRemuneratorias,
  });
  const itens: ItemCalculoFinanceiroHoraExtra[] = [];

  for (const bloco of blocos) {
    for (const hora of bloco.datas) {
      const tipoDia = hora.tipoDia ?? "DIA_UTIL";
      const regra = regrasPorTipoDia.get(tipoDia);

      if (!regra) {
        throw new Error(`Regra financeira ausente para ${tipoDia}.`);
      }

      const valor =
        (bloco.remuneracaoBaseCentavos / params.divisorMinutos) *
        hora.minutos *
        (1 + regra.percentual / 100);

      itens.push({
        data: hora.data,
        minutos: hora.minutos,
        tipoDia,
        vigenciaRemuneratoriaId: bloco.vigenciaId,
        remuneracaoBaseCentavos: bloco.remuneracaoBaseCentavos,
        divisorMinutos: params.divisorMinutos,
        percentual: regra.percentual,
        rubrica: regra.rubrica,
        valorCentavos: arredondarCentavos(valor),
      });
    }
  }

  return {
    itens,
    totalCentavos: itens.reduce((total, item) => total + item.valorCentavos, 0),
  };
}
