import { describe, expect, it } from "vitest";

import { classificarHorasCreditoBancoHoras } from "./classificar-horas-banco-horas.service";
import type { ClassificacaoDiaInstitucional } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";

const regulamentacao = {
  jornada7hCreditoMinimoMinutos: 8 * 60,
  jornada7hIntervaloMinimoMinutos: 60,
};

function classificacao(tipo: ClassificacaoDiaInstitucional["tipo"]) {
  return {
    dataReferencia: new Date("2026-07-18T00:00:00.000Z"),
    tipo,
    descricao: tipo,
    fonte: "PADRAO",
    contaComoDiaUtil: tipo === "UTIL",
    geraApuracaoRegular: tipo === "UTIL",
  } satisfies ClassificacaoDiaInstitucional;
}

describe("classificarHorasCreditoBancoHoras", () => {
  it("não computa crédito sem autorização prévia", () => {
    const resultado = classificarHorasCreditoBancoHoras({
      apuracao: {
        cargaPrevistaMinutos: 480,
        minutosTrabalhados: 540,
        minutosIntervalo: 60,
        minutosCredito: 60,
      },
      classificacaoDia: classificacao("UTIL"),
      regulamentacao,
      temAutorizacaoPrevia: false,
    });

    expect(resultado.minutosComputaveis).toBe(0);
    expect(resultado.minutosNaoComputaveis).toBe(60);
    expect(resultado.codigoFundamento).toBe("SEM_AUTORIZACAO_PREVIA");
  });

  it("para jornada de 7h computa apenas o que excede a oitava hora", () => {
    const resultado = classificarHorasCreditoBancoHoras({
      apuracao: {
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 510,
        minutosIntervalo: 60,
        minutosCredito: 90,
      },
      classificacaoDia: classificacao("UTIL"),
      regulamentacao,
      temAutorizacaoPrevia: true,
    });

    expect(resultado.minutosComputaveis).toBe(30);
    expect(resultado.minutosNaoComputaveis).toBe(60);
    expect(resultado.codigoFundamento).toBe("JORNADA_7H_APOS_OITAVA_HORA");
  });

  it("não computa jornada de 7h sem intervalo mínimo", () => {
    const resultado = classificarHorasCreditoBancoHoras({
      apuracao: {
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 540,
        minutosIntervalo: 30,
        minutosCredito: 120,
      },
      classificacaoDia: classificacao("UTIL"),
      regulamentacao,
      temAutorizacaoPrevia: true,
    });

    expect(resultado.minutosComputaveis).toBe(0);
    expect(resultado.codigoFundamento).toBe("JORNADA_7H_SEM_INTERVALO_MINIMO");
  });

  it("aplica 50% no sábado somente com conversão administrativa", () => {
    const semConversao = classificarHorasCreditoBancoHoras({
      apuracao: {
        cargaPrevistaMinutos: 0,
        minutosTrabalhados: 240,
        minutosIntervalo: 0,
        minutosCredito: 240,
      },
      classificacaoDia: classificacao("SABADO"),
      regulamentacao,
      temAutorizacaoPrevia: true,
      permiteConversaoEspecial: false,
    });
    const comConversao = classificarHorasCreditoBancoHoras({
      apuracao: {
        cargaPrevistaMinutos: 0,
        minutosTrabalhados: 240,
        minutosIntervalo: 0,
        minutosCredito: 240,
      },
      classificacaoDia: classificacao("SABADO"),
      regulamentacao,
      temAutorizacaoPrevia: true,
      permiteConversaoEspecial: true,
    });

    expect(semConversao.minutosComputaveis).toBe(0);
    expect(comConversao.minutosComputaveis).toBe(360);
  });

  it("no ponto facultativo converte só o excedente após a oitava hora", () => {
    const resultado = classificarHorasCreditoBancoHoras({
      apuracao: {
        cargaPrevistaMinutos: 0,
        minutosTrabalhados: 540,
        minutosIntervalo: 60,
        minutosCredito: 540,
      },
      classificacaoDia: classificacao("PONTO_FACULTATIVO"),
      regulamentacao,
      temAutorizacaoPrevia: true,
      permiteConversaoEspecial: true,
    });

    expect(resultado.minutosComputaveis).toBe(90);
    expect(resultado.multiplicadorAplicado).toBe(1.5);
  });

  it("marca alerta quando há horário antes das 6h ou depois das 19h", () => {
    const resultado = classificarHorasCreditoBancoHoras({
      apuracao: {
        cargaPrevistaMinutos: 480,
        minutosTrabalhados: 540,
        minutosIntervalo: 60,
        minutosCredito: 60,
        ultimaSaida: new Date("2026-07-20T20:10:00.000Z"),
      },
      classificacaoDia: classificacao("UTIL"),
      regulamentacao,
      temAutorizacaoPrevia: true,
    });

    expect(resultado.exigeJustificativaEspecifica).toBe(true);
    expect(resultado.alertas).toHaveLength(1);
  });
});
