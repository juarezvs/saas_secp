import { describe, expect, it } from "vitest";

import { calcularValorHorasExtras } from "./calcular-valor-horas-extras.service";
import { parseIsoDateOnly } from "./horas-extras-datas.service";
import { segmentarHorasExtrasPorVigenciaRemuneratoria } from "./segmentar-remuneracao-horas-extras.service";

const vigencia = {
  id: "ato-rh-1", inicio: "2026-10-01", fim: "2026-10-31",
  remuneracaoBaseCentavos: 800000, origem: "MANUAL" as const,
};
const entrada = {
  divisorMinutos: 12000,
  horasReconhecidas: [{ data: "2026-10-14", minutos: 120, tipoDia: "DIA_UTIL" }],
  vigenciasRemuneratorias: [vigencia],
  regrasFinanceiras: [{ tipoDia: "DIA_UTIL", percentual: 50 }],
};

describe("conformidade do calculo financeiro de horas extras", () => {
  it("arredonda meio centavo sem erro binario, por item", () => {
    const resultado = calcularValorHorasExtras({
      ...entrada,
      horasReconhecidas: [{ data: "2026-10-14", minutos: 112, tipoDia: "DIA_UTIL" }],
      vigenciasRemuneratorias: [{ ...vigencia, remuneracaoBaseCentavos: 250 }],
    });
    expect(resultado.totalCentavos).toBe(4);
  });

  it("usa R$8000 ate dia14 e R$9000 a partir do dia15, sem alterar o snapshot anterior", () => {
    const historico = [
      { ...vigencia, fim: "2026-10-14" },
      { ...vigencia, id: "ato-rh-2", inicio: "2026-10-15", remuneracaoBaseCentavos: 900000 },
    ];
    const congelado = JSON.stringify(historico);
    const resultado = calcularValorHorasExtras({
      ...entrada, vigenciasRemuneratorias: historico,
      horasReconhecidas: [
        ...entrada.horasReconhecidas,
        { data: "2026-10-15", minutos: 120, tipoDia: "DIA_UTIL" },
      ],
    });
    expect(resultado.itens.map((item) => item.valorCentavos)).toEqual([12000, 13500]);
    expect(resultado.totalCentavos).toBe(25500);
    expect(JSON.stringify(historico)).toBe(congelado);
  });

  it("nao escolhe silenciosamente uma das remuneracoes sobrepostas", () => {
    expect(() => calcularValorHorasExtras({
      ...entrada,
      vigenciasRemuneratorias: [vigencia, { ...vigencia, id: "retificacao", inicio: "2026-10-15" }],
    })).toThrow(/sobrepostas/);
  });

  it("exige encerramento da vigencia anterior antes de uma nova", () => {
    expect(() => calcularValorHorasExtras({
      ...entrada,
      vigenciasRemuneratorias: [
        { ...vigencia, fim: undefined },
        { ...vigencia, id: "nova", inicio: "2026-11-01", fim: undefined },
      ],
    })).toThrow(/sobrepostas/);
  });

  it("rejeita intervalo remuneratorio invertido e identificadores duplicados", () => {
    expect(() => calcularValorHorasExtras({
      ...entrada, vigenciasRemuneratorias: [{ ...vigencia, fim: "2026-09-30" }],
    })).toThrow(/anterior ao inicio/);
    expect(() => calcularValorHorasExtras({
      ...entrada, vigenciasRemuneratorias: [vigencia, { ...vigencia, inicio: "2026-11-01", fim: undefined }],
    })).toThrow(/duplicado/);
  });

  it.each([NaN, Infinity, -1, 0, 1.5])("rejeita base em centavos invalida: %s", (base) => {
    expect(() => calcularValorHorasExtras({
      ...entrada, vigenciasRemuneratorias: [{ ...vigencia, remuneracaoBaseCentavos: base }],
    })).toThrow(/centavos inteiros/);
  });

  it.each([NaN, Infinity, -1, 0, 1.5])("rejeita divisor invalido: %s", (divisor) => {
    expect(() => calcularValorHorasExtras({ ...entrada, divisorMinutos: divisor })).toThrow(/Divisor/);
  });

  it.each([NaN, Infinity, -50])("rejeita percentual invalido: %s", (percentual) => {
    expect(() => calcularValorHorasExtras({
      ...entrada, regrasFinanceiras: [{ tipoDia: "DIA_UTIL", percentual }],
    })).toThrow(/Percentual/);
  });

  it("rejeita duplicidade de regra e minutos fracionarios reconhecidos", () => {
    expect(() => calcularValorHorasExtras({
      ...entrada, regrasFinanceiras: [...entrada.regrasFinanceiras, ...entrada.regrasFinanceiras],
    })).toThrow(/duplicada/);
    expect(() => segmentarHorasExtrasPorVigenciaRemuneratoria({
      vigencias: [vigencia], horasReconhecidas: [{ data: "2026-10-14", minutos: 0.5 }],
    })).toThrow(/minutos inteiros/);
  });

  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01"])("rejeita data civil inexistente: %s", (data) => {
    expect(() => parseIsoDateOnly(data)).toThrow(/Data invalida/);
  });
  it("aceita dia bissexto real", () => {
    expect(parseIsoDateOnly("2028-02-29").toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("bloqueia perda de precisao em um item financeiro", () => {
    expect(() => calcularValorHorasExtras({
      ...entrada, divisorMinutos: 1,
      vigenciasRemuneratorias: [{ ...vigencia, remuneracaoBaseCentavos: Number.MAX_SAFE_INTEGER }],
    })).toThrow(/Valor calculado excede/);
  });

  it("bloqueia perda de precisao na soma de itens individualmente validos", () => {
    expect(() => calcularValorHorasExtras({
      ...entrada, divisorMinutos: 120,
      regrasFinanceiras: [{ tipoDia: "DIA_UTIL", percentual: 0 }],
      vigenciasRemuneratorias: [{ ...vigencia, remuneracaoBaseCentavos: Number.MAX_SAFE_INTEGER }],
      horasReconhecidas: [
        { data: "2026-10-13", minutos: 120, tipoDia: "DIA_UTIL" },
        ...entrada.horasReconhecidas,
      ],
    })).toThrow(/Total calculado excede/);
  });
});
