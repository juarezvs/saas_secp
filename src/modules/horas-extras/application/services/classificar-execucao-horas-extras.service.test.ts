import { describe, expect, it } from "vitest";

import { classificarExecucaoHorasExtras } from "./classificar-execucao-horas-extras.service";

describe("classificarExecucaoHorasExtras", () => {
  it("aplica o exemplo completo: faixa permitida, debito antes da HE e limite global", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limiteGlobalMinutos: 14 * 60,
        limitesPorTipoDia: { DOMINGO: 14 * 60 },
        faixaInicio: "07:00",
      },
      debitoInicialMinutos: 7 * 60 + 26,
      intervalosTrabalhados: [
        { data: "2026-08-02", inicio: "07:00", fim: "12:12" },
        { data: "2026-08-09", inicio: "06:55", fim: "14:31" },
      ],
    });

    expect(resultado.totais.TRABALHADO).toBe(12 * 60 + 48);
    expect(resultado.totais.FORA_FAIXA_PERMITIDA).toBe(5);
    expect(resultado.totais.ANALISAVEL).toBe(12 * 60 + 43);
    expect(resultado.debitoCompensadoMinutos).toBe(7 * 60 + 26);
    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(5 * 60 + 17);
  });

  it("transforma todo o trabalho elegivel em HE quando nao ha debito", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limiteGlobalMinutos: 8 * 60,
      },
      intervalosTrabalhados: [
        { data: "2026-08-03", inicio: "18:00", fim: "20:00" },
      ],
    });

    expect(resultado.totais.COMPENSACAO_DEBITO).toBe(0);
    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(120);
  });

  it("mantem debito remanescente quando o debito e maior que o trabalho analisavel", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limiteGlobalMinutos: 8 * 60,
      },
      debitoInicialMinutos: 180,
      intervalosTrabalhados: [
        { data: "2026-08-03", inicio: "18:00", fim: "20:00" },
      ],
    });

    expect(resultado.totais.COMPENSACAO_DEBITO).toBe(120);
    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(0);
    expect(resultado.debitoRemanescenteMinutos).toBe(60);
  });

  it("nao reconhece HE quando o debito e exatamente igual ao trabalho analisavel", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limiteGlobalMinutos: 8 * 60,
      },
      debitoInicialMinutos: 120,
      intervalosTrabalhados: [
        { data: "2026-08-03", inicio: "18:00", fim: "20:00" },
      ],
    });

    expect(resultado.totais.COMPENSACAO_DEBITO).toBe(120);
    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(0);
    expect(resultado.debitoRemanescenteMinutos).toBe(0);
  });

  it("classifica excesso acima do limite global autorizado", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limiteGlobalMinutos: 7 * 60,
      },
      intervalosTrabalhados: [
        { data: "2026-08-09", inicio: "07:00", fim: "14:36" },
      ],
    });

    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(7 * 60);
    expect(resultado.totais.EXCEDENTE_A_AUTORIZACAO).toBe(36);
  });

  it("classifica trabalho fora do periodo como nao autorizado", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limiteGlobalMinutos: 120,
      },
      intervalosTrabalhados: [
        { data: "2026-09-01", inicio: "18:00", fim: "19:00" },
      ],
    });

    expect(resultado.totais.NAO_AUTORIZADA).toBe(60);
    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(0);
  });

  it("respeita autorizacao por datas especificas", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        regrasPorData: [{ data: "2026-08-02", limiteMinutos: 300 }],
      },
      intervalosTrabalhados: [
        { data: "2026-08-02", inicio: "07:00", fim: "09:00" },
        { data: "2026-08-09", inicio: "07:00", fim: "09:00" },
      ],
    });

    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(120);
    expect(resultado.totais.NAO_AUTORIZADA).toBe(120);
  });

  it("aplica regra geral de faixa sem transformar a autorizacao em datas especificas", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limiteGlobalMinutos: 300,
        regrasPorData: [{ faixaInicio: "07:00" }],
      },
      intervalosTrabalhados: [
        { data: "2026-08-09", inicio: "06:55", fim: "08:00" },
      ],
    });

    expect(resultado.totais.FORA_FAIXA_PERMITIDA).toBe(5);
    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(60);
    expect(resultado.totais.NAO_AUTORIZADA).toBe(0);
  });

  it("separa trabalho antes e depois da faixa permitida", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limiteGlobalMinutos: 300,
        faixaInicio: "07:00",
        faixaFim: "10:00",
      },
      intervalosTrabalhados: [
        { data: "2026-08-03", inicio: "06:30", fim: "10:30" },
      ],
    });

    expect(resultado.totais.FORA_FAIXA_PERMITIDA).toBe(60);
    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(180);
  });

  it("aplica limite diario por tipo de dia", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limitesPorTipoDia: {
          DIA_UTIL: 120,
          SABADO: 360,
          DOMINGO: 420,
        },
      },
      intervalosTrabalhados: [
        { data: "2026-08-03", inicio: "18:00", fim: "21:00" },
        { data: "2026-08-08", inicio: "07:00", fim: "12:00" },
        { data: "2026-08-09", inicio: "07:00", fim: "15:00" },
      ],
    });

    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(120 + 300 + 420);
    expect(resultado.totais.EXCEDENTE_A_AUTORIZACAO).toBe(120);
  });

  it("impede que a mesma fracao classificada como debito tambem conte como HE", () => {
    const resultado = classificarExecucaoHorasExtras({
      autorizacao: {
        periodoInicio: "2026-08-01",
        periodoFim: "2026-08-31",
        limiteGlobalMinutos: 300,
      },
      debitoInicialMinutos: 30,
      intervalosTrabalhados: [
        { data: "2026-08-03", inicio: "18:00", fim: "19:00" },
      ],
    });

    const totalClassificado =
      resultado.totais.COMPENSACAO_DEBITO +
      resultado.totais.HORA_EXTRA_RECONHECIDA +
      resultado.totais.EXCEDENTE_A_AUTORIZACAO +
      resultado.totais.NAO_AUTORIZADA +
      resultado.totais.FORA_FAIXA_PERMITIDA;

    expect(totalClassificado).toBe(resultado.totais.TRABALHADO);
    expect(resultado.totais.COMPENSACAO_DEBITO).toBe(30);
    expect(resultado.totais.HORA_EXTRA_RECONHECIDA).toBe(30);
  });
});
