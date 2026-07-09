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
});
