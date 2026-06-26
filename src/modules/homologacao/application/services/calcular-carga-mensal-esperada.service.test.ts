import { describe, expect, it } from "vitest";

import type { CalendarioInstitucionalPrecarregado } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";

import { calcularCargaMensalEsperada } from "./calcular-carga-mensal-esperada.service";

function calendarioComFeriado(data: string): CalendarioInstitucionalPrecarregado {
  return {
    eventosPorData: new Map([
      [
        data,
        {
          id: "evento-feriado",
          dataReferencia: new Date(`${data}T00:00:00.000Z`),
          descricao: "Feriado institucional",
          tipo: "FERIADO",
          contaComoDiaUtil: false,
          geraApuracaoRegular: false,
          janelaInicio: null,
          janelaFim: null,
          dataOriginal: null,
          dataSubstituida: false,
          observacao: null,
          ativo: true,
          criadoEm: new Date("2026-01-01T00:00:00.000Z"),
          atualizadoEm: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    ]),
    recessos: [],
  };
}

describe("calcularCargaMensalEsperada", () => {
  it("calcula dias uteis do mes multiplicados pela jornada vigente", async () => {
    const resultado = await calcularCargaMensalEsperada({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: calendarioComFeriado("2026-06-08"),
      jornadas: [
        {
          id: "jornada-7h",
          dataInicio: new Date("2026-01-01T00:00:00.000Z"),
          dataFim: null,
          jornada: {
            cargaDiariaMinutos: 7 * 60,
          },
        },
      ],
    });

    expect(resultado.diasUteis).toBe(21);
    expect(resultado.dias).toHaveLength(21);
    expect(resultado.cargaPrevistaMinutos).toBe(21 * 7 * 60);
    expect(
      resultado.dias.some(
        (dia) => dia.dataReferencia.toISOString().slice(0, 10) === "2026-06-08",
      ),
    ).toBe(false);
  });

  it("respeita alteracao de jornada dentro da competencia", async () => {
    const resultado = await calcularCargaMensalEsperada({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: { eventosPorData: new Map(), recessos: [] },
      jornadas: [
        {
          id: "jornada-7h",
          dataInicio: new Date("2026-01-01T00:00:00.000Z"),
          dataFim: new Date("2026-06-14T00:00:00.000Z"),
          jornada: {
            cargaDiariaMinutos: 7 * 60,
          },
        },
        {
          id: "jornada-8h",
          dataInicio: new Date("2026-06-15T00:00:00.000Z"),
          dataFim: null,
          jornada: {
            cargaDiariaMinutos: 8 * 60,
          },
        },
      ],
    });

    expect(resultado.dias).toHaveLength(22);
    expect(resultado.cargaPrevistaMinutos).toBe(10 * 7 * 60 + 12 * 8 * 60);
    expect(resultado.dias[0]).toEqual(
      expect.objectContaining({
        jornadaServidorId: "jornada-7h",
        cargaPrevistaMinutos: 420,
      }),
    );
    expect(resultado.dias.at(-1)).toEqual(
      expect.objectContaining({
        jornadaServidorId: "jornada-8h",
        cargaPrevistaMinutos: 480,
      }),
    );
  });

  it("registra dias uteis sem jornada vigente como lacuna impeditiva", async () => {
    const resultado = await calcularCargaMensalEsperada({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: { eventosPorData: new Map(), recessos: [] },
      jornadas: [],
    });

    expect(resultado.dias).toHaveLength(0);
    expect(resultado.diasUteisSemJornada).toHaveLength(22);
    expect(resultado.cargaPrevistaMinutos).toBe(0);
  });

  it("reduz carga mensal quando o calendario define expediente parcial", async () => {
    const calendario: CalendarioInstitucionalPrecarregado = {
      eventosPorData: new Map([
        [
          "2026-06-10",
          {
            id: "evento-cinzas",
            dataReferencia: new Date("2026-06-10T00:00:00.000Z"),
            descricao: "Expediente parcial",
            tipo: "PONTO_FACULTATIVO",
            contaComoDiaUtil: true,
            geraApuracaoRegular: true,
            janelaInicio: "12:00",
            janelaFim: "18:00",
            dataOriginal: null,
            dataSubstituida: false,
            observacao: null,
            ativo: true,
            criadoEm: new Date("2026-01-01T00:00:00.000Z"),
            atualizadoEm: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      ]),
      recessos: [],
    };

    const resultado = await calcularCargaMensalEsperada({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario,
      jornadas: [
        {
          id: "jornada-7h",
          dataInicio: new Date("2026-01-01T00:00:00.000Z"),
          dataFim: null,
          jornada: {
            cargaDiariaMinutos: 7 * 60,
          },
        },
      ],
    });

    const diaParcial = resultado.dias.find(
      (dia) => dia.dataReferencia.toISOString().slice(0, 10) === "2026-06-10",
    );

    expect(diaParcial?.cargaPrevistaMinutos).toBe(6 * 60);
    expect(resultado.cargaPrevistaMinutos).toBe(21 * 7 * 60 + 6 * 60);
  });
});
