import { describe, expect, it, vi } from "vitest";

import { resolverDataReferenciaOperacionalMarcacaoService } from "./resolver-data-referencia-operacional-marcacao.service";

describe("resolverDataReferenciaOperacionalMarcacaoService", () => {
  it("atribui ao dia anterior uma marcacao de madrugada que fecha sequencia aberta a noite", async () => {
    const client = {
      marcacao: {
        findMany: vi.fn().mockResolvedValue([
          { dataHora: new Date("2026-05-27T11:52:00.000Z") },
          { dataHora: new Date("2026-05-27T19:09:00.000Z") },
          { dataHora: new Date("2026-05-28T01:26:00.000Z") },
        ]),
      },
    };

    const resultado = await resolverDataReferenciaOperacionalMarcacaoService(
      client as never,
      {
        servidorId: "servidor-1",
        dataHora: new Date("2026-05-28T04:43:00.000Z"),
        dataReferenciaCivil: new Date("2026-05-28T00:00:00.000Z"),
        fusoHorario: "America/Manaus",
        origem: "IMPORTACAO_AFD",
      },
    );

    expect(resultado.dataReferencia.toISOString()).toBe(
      "2026-05-27T00:00:00.000Z",
    );
    expect(resultado.ajustadaParaDiaAnterior).toBe(true);
  });

  it("mantem a data civil quando nao ha sequencia aberta no dia anterior", async () => {
    const client = {
      marcacao: {
        findMany: vi.fn().mockResolvedValue([
          { dataHora: new Date("2026-05-27T12:00:00.000Z") },
          { dataHora: new Date("2026-05-27T19:00:00.000Z") },
        ]),
      },
    };

    const resultado = await resolverDataReferenciaOperacionalMarcacaoService(
      client as never,
      {
        servidorId: "servidor-1",
        dataHora: new Date("2026-05-28T04:43:00.000Z"),
        dataReferenciaCivil: new Date("2026-05-28T00:00:00.000Z"),
        fusoHorario: "America/Manaus",
        origem: "IMPORTACAO_AFD",
      },
    );

    expect(resultado.dataReferencia.toISOString()).toBe(
      "2026-05-28T00:00:00.000Z",
    );
    expect(resultado.ajustadaParaDiaAnterior).toBe(false);
  });

  it("usa o limite de madrugada parametrizado pela regulamentacao", async () => {
    const client = {
      marcacao: {
        findMany: vi.fn().mockResolvedValue([
          { dataHora: new Date("2026-05-27T22:00:00.000Z") },
        ]),
      },
    };

    const resultado = await resolverDataReferenciaOperacionalMarcacaoService(
      client as never,
      {
        servidorId: "servidor-1",
        dataHora: new Date("2026-05-28T09:30:00.000Z"),
        dataReferenciaCivil: new Date("2026-05-28T00:00:00.000Z"),
        fusoHorario: "America/Manaus",
        origem: "IMPORTACAO_AFD",
        regulamentacaoPonto: {
          limiteViradaMadrugada: "06:00",
          inicioJanelaNoite: "18:00",
        },
      },
    );

    expect(resultado.dataReferencia.toISOString()).toBe(
      "2026-05-27T00:00:00.000Z",
    );
    expect(resultado.ajustadaParaDiaAnterior).toBe(true);
  });

  it("usa o inicio de janela noturna parametrizado pela regulamentacao", async () => {
    const client = {
      marcacao: {
        findMany: vi.fn().mockResolvedValue([
          { dataHora: new Date("2026-05-27T21:30:00.000Z") },
        ]),
      },
    };

    const resultado = await resolverDataReferenciaOperacionalMarcacaoService(
      client as never,
      {
        servidorId: "servidor-1",
        dataHora: new Date("2026-05-28T07:00:00.000Z"),
        dataReferenciaCivil: new Date("2026-05-28T00:00:00.000Z"),
        fusoHorario: "America/Manaus",
        origem: "IMPORTACAO_AFD",
        regulamentacaoPonto: {
          limiteViradaMadrugada: "04:00",
          inicioJanelaNoite: "18:00",
        },
      },
    );

    expect(resultado.dataReferencia.toISOString()).toBe(
      "2026-05-28T00:00:00.000Z",
    );
    expect(resultado.ajustadaParaDiaAnterior).toBe(false);
  });

  it("considera marcacoes faciais na sequencia operacional aberta", async () => {
    const client = {
      marcacao: {
        findMany: vi.fn().mockResolvedValue([
          { dataHora: new Date("2026-05-27T22:15:00.000Z") },
        ]),
      },
    };

    const resultado = await resolverDataReferenciaOperacionalMarcacaoService(
      client as never,
      {
        servidorId: "servidor-1",
        dataHora: new Date("2026-05-28T06:30:00.000Z"),
        dataReferenciaCivil: new Date("2026-05-28T00:00:00.000Z"),
        fusoHorario: "America/Manaus",
        origem: "BIOMETRIA_FACIAL",
      },
    );

    expect(resultado.dataReferencia.toISOString()).toBe(
      "2026-05-27T00:00:00.000Z",
    );
    expect(resultado.ajustadaParaDiaAnterior).toBe(true);
  });

  it("prioriza limite de virada da jornada do dia anterior quando cruza meia-noite", async () => {
    const client = {
      jornadaServidor: {
        findFirst: vi.fn().mockResolvedValue({
          dataInicio: new Date("2026-05-01T00:00:00.000Z"),
          escala: null,
          jornada: {
            tipo: "FIXA_SEMANAL",
            cargaDiariaMinutos: 480,
            horarioEntradaPadrao: "17:00",
            horarioSaidaPadrao: "02:00",
            horarioLimiteVirada: "06:00",
            cruzaMeiaNoite: true,
            controlaHorario: true,
            dias: [
              {
                diaSemana: "QUARTA",
                ordemNoCiclo: null,
                tipoDia: "TRABALHO",
                cargaPrevistaMinutos: 480,
                faixas: [
                  {
                    tipo: "TRABALHO",
                    horaInicio: "17:00",
                    horaFim: "02:00",
                    cruzaMeiaNoite: true,
                    ordem: 1,
                  },
                ],
              },
            ],
          },
        }),
      },
      marcacao: {
        findMany: vi.fn().mockResolvedValue([
          { dataHora: new Date("2026-05-27T21:30:00.000Z") },
        ]),
      },
    };

    const resultado = await resolverDataReferenciaOperacionalMarcacaoService(
      client as never,
      {
        servidorId: "servidor-1",
        dataHora: new Date("2026-05-28T09:30:00.000Z"),
        dataReferenciaCivil: new Date("2026-05-28T00:00:00.000Z"),
        fusoHorario: "America/Manaus",
        origem: "IMPORTACAO_AFD",
        regulamentacaoPonto: {
          limiteViradaMadrugada: "04:00",
          inicioJanelaNoite: "18:00",
        },
      },
    );

    expect(resultado.dataReferencia.toISOString()).toBe(
      "2026-05-27T00:00:00.000Z",
    );
    expect(resultado.ajustadaParaDiaAnterior).toBe(true);
  });
});
