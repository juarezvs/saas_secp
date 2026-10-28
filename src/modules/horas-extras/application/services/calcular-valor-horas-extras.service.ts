import { Decimal } from "@prisma/client/runtime/client";

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

// Instância local: não altera a precisão de outros cálculos do sistema.
const Dinheiro = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export function calcularValorHorasExtras(params: {
  horasReconhecidas: HoraExtraReconhecidaFinanceira[];
  vigenciasRemuneratorias: VigenciaRemuneratoriaHoraExtra[];
  regrasFinanceiras: RegraFinanceiraHoraExtra[];
  divisorMinutos: number;
}): ResultadoCalculoFinanceiroHoraExtra {
  if (!Number.isSafeInteger(params.divisorMinutos) || params.divisorMinutos <= 0) {
    throw new Error("Divisor financeiro deve ser inteiro e maior que zero.");
  }

  const tipos = new Set<string>();
  for (const regra of params.regrasFinanceiras) {
    if (tipos.has(regra.tipoDia)) throw new Error(`Regra financeira duplicada para ${regra.tipoDia}.`);
    tipos.add(regra.tipoDia);
    if (!Number.isFinite(regra.percentual) || regra.percentual < 0) {
      throw new Error("Percentual financeiro deve ser finito e nao negativo.");
    }
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

      const valor = new Dinheiro(bloco.remuneracaoBaseCentavos)
        .mul(hora.minutos)
        .mul(new Dinheiro(regra.percentual.toString()).div(100).plus(1))
        .div(params.divisorMinutos)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber();
      if (!Number.isSafeInteger(valor)) throw new Error("Valor calculado excede a precisao suportada em centavos.");

      itens.push({
        data: hora.data,
        minutos: hora.minutos,
        tipoDia,
        vigenciaRemuneratoriaId: bloco.vigenciaId,
        remuneracaoBaseCentavos: bloco.remuneracaoBaseCentavos,
        divisorMinutos: params.divisorMinutos,
        percentual: regra.percentual,
        rubrica: regra.rubrica,
        valorCentavos: valor,
      });
    }
  }

  const totalCentavos = itens.reduce((total, item) => total + item.valorCentavos, 0);
  if (!Number.isSafeInteger(totalCentavos)) throw new Error("Total calculado excede a precisao suportada em centavos.");
  return {
    itens,
    totalCentavos,
  };
}
