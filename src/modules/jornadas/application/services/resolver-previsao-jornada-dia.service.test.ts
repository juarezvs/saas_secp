import { describe, expect, it } from "vitest";

import { resolverPrevisaoJornadaDia } from "./resolver-previsao-jornada-dia.service";

const jornadaBase = {
  tipo: "ESCALA_CICLICA",
  cargaDiariaMinutos: 420,
  horarioEntradaPadrao: "08:00",
  horarioSaidaPadrao: "15:00",
  cruzaMeiaNoite: false,
  controlaHorario: true,
  dias: [],
};

describe("resolverPrevisaoJornadaDia", () => {
  it("prioriza escala ciclica por posicao calculada pela data de ancoragem", () => {
    const previsao = resolverPrevisaoJornadaDia({
      jornada: jornadaBase,
      dataReferencia: new Date("2026-06-02T00:00:00Z"),
      escala: {
        tipo: "CICLICA",
        quantidadeDiasCiclo: 2,
        dataAncoragem: new Date("2026-06-01T00:00:00Z"),
        primeiroDiaTrabalho: null,
        dias: [
          {
            diaSemana: null,
            posicaoCiclo: 1,
            tipoDia: "TRABALHO",
            trabalha: true,
            horarioEntrada: "07:00",
            horarioSaida: "19:00",
            intervaloInicio: null,
            intervaloFim: null,
            cargaPrevistaMinutos: 720,
            cruzaMeiaNoite: false,
          },
          {
            diaSemana: null,
            posicaoCiclo: 2,
            tipoDia: "FOLGA",
            trabalha: false,
            horarioEntrada: null,
            horarioSaida: null,
            intervaloInicio: null,
            intervaloFim: null,
            cargaPrevistaMinutos: 0,
            cruzaMeiaNoite: false,
          },
        ],
      },
    });

    expect(previsao.fonte).toBe("ESCALA");
    expect(previsao.escalaPosicaoCiclo).toBe(2);
    expect(previsao.trabalha).toBe(false);
    expect(previsao.cargaPrevistaMinutos).toBe(0);
  });

  it("usa dia configurado da jornada quando nao ha escala atribuida", () => {
    const previsao = resolverPrevisaoJornadaDia({
      jornada: {
        ...jornadaBase,
        tipo: "FIXA_SEMANAL",
        dias: [
          {
            diaSemana: "SEGUNDA",
            ordemNoCiclo: null,
            tipoDia: "TRABALHO",
            cargaPrevistaMinutos: 360,
            faixas: [
              {
                tipo: "TRABALHO",
                horaInicio: "09:00",
                horaFim: "15:00",
                cruzaMeiaNoite: false,
                ordem: 1,
              },
            ],
          },
        ],
      },
      dataReferencia: new Date("2026-06-01T00:00:00Z"),
    });

    expect(previsao.fonte).toBe("JORNADA_DIA");
    expect(previsao.cargaPrevistaMinutos).toBe(360);
    expect(previsao.janela).toEqual({
      inicio: "09:00",
      fim: "15:00",
      cruzaMeiaNoite: false,
    });
  });
});
