import { describe, expect, it } from "vitest";
import type { AnaliseJornadaMctDto } from "../dtos/analise-jornada.dto";
import { preValidarCompetenciaMct } from "./pre-validar-competencia-mct.service";

function analise(
  sobrescrever: Partial<AnaliseJornadaMctDto> = {},
): AnaliseJornadaMctDto {
  return {
    execucaoId: "exec-1",
    dataReferencia: "2026-09-25",
    modo: "SHADOW",
    status: "CONCLUIDA",
    versaoMotor: "0.1.0",
    iniciadaEm: "2026-09-25T20:00:00.000Z",
    finalizadaEm: "2026-09-25T20:00:01.000Z",
    duracaoMs: 1000,
    politica: { codigo: "PADRAO", nome: "Padrão", versao: 1 },
    resultadoJornada: { excedentePendenteMinutos: 0 },
    resultadoConformidade: {},
    memoriaCalculo: { conflitosClassificacao: [] },
    eventos: [],
    segmentos: [],
    fatos: [],
    rubricas: [],
    comparacaoLegado: null,
    historico: [],
    ...sobrescrever,
  };
}

describe("preValidarCompetenciaMct", () => {
  it("informa cobertura ausente sem produzir efeito oficial", () => {
    const resultado = preValidarCompetenciaMct({
      datasApuradas: ["2026-09-25", "2026-09-26"],
      analises: { "2026-09-25": analise() },
    });

    expect(resultado).toMatchObject({
      modo: "SHADOW",
      efeitoOficial: false,
      diasApurados: 2,
      diasAnalisados: 1,
    });
    expect(resultado.pendencias).toContainEqual(
      expect.objectContaining({ tipo: "DIA_NAO_PROCESSADO", quantidade: 1 }),
    );
  });

  it("consolida conflitos, pendencias e divergencias por data", () => {
    const resultado = preValidarCompetenciaMct({
      datasApuradas: ["2026-09-25"],
      analises: {
        "2026-09-25": analise({
          resultadoJornada: { excedentePendenteMinutos: 11 },
          memoriaCalculo: { conflitosClassificacao: [{ codigo: "CONFLITO" }] },
          rubricas: [
            {
              id: "r1",
              codigo: "DST-PENDENTE",
              nome: "Pendente",
              dimensao: "DESTINACAO",
              quantidade: 11,
              status: "PENDENTE_HOMOLOGACAO",
              destinacao: null,
              explicacao: null,
              baseIncidencia: null,
              fundamentoNormativo: null,
            },
          ],
          comparacaoLegado: {
            totalDivergencias: 1,
            possuiDivergenciaCritica: true,
            divergencias: [],
            comparadoEm: "2026-09-25T20:00:02.000Z",
          },
        }),
      },
    });

    expect(resultado.possuiPendenciaCritica).toBe(true);
    expect(resultado.pendencias.map((item) => item.tipo)).toEqual([
      "CLASSIFICACAO_CONFLITANTE",
      "RUBRICA_PENDENTE",
      "EXCEDENTE_SEM_DESTINACAO",
      "DIVERGENCIA_CRITICA",
    ]);
  });
});
