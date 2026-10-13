import { describe, expect, it } from "vitest";
import { planejarDia } from "./planejador-temporal";

const dia = (valor: string) => new Date(`${valor}T00:00:00Z`);

describe("planejarDia", () => {
  it.each([
    ["5x2", [true, true, true, true, true, false, false]],
    ["6x1", [true, true, true, true, true, true, false]],
    ["5x1", [true, true, true, true, true, false]],
    ["12x36", [true, false]],
  ])("representa %s pelo mesmo ciclo composicional", (_nome, padrao) => {
    const ciclo = {
      ancora: dia("2026-10-01"),
      dias: (padrao as boolean[]).map((trabalha, posicao) => ({
        posicao,
        trabalha,
        cargaMinutos: trabalha ? 420 : 0,
        codigo: trabalha ? "TRABALHO" : "DESCANSO",
      })),
    };

    const obtido = (padrao as boolean[]).map((_item, indice) =>
      planejarDia({
        dataReferencia: new Date(dia("2026-10-01").getTime() + indice * 86_400_000),
        cargaPadraoMinutos: 420,
        ciclo,
      }).trabalha,
    );
    expect(obtido).toEqual(padrao);
  });

  it("compoe afastamento e reconhecimento sem algoritmo especial", () => {
    const plano = planejarDia({
      dataReferencia: dia("2026-10-13"),
      cargaPadraoMinutos: 420,
      ocorrencias: [
        { id: "horario-reduzido", prioridade: 10, inicio: dia("2026-10-01"), fim: dia("2026-10-31"), efeito: { tipo: "REDUZ_CARGA", minutos: 60 } },
        { id: "abono-parcial", prioridade: 20, inicio: dia("2026-10-13"), fim: dia("2026-10-13"), efeito: { tipo: "CONSIDERA_CUMPRIDA", minutos: 120 } },
      ],
    });

    expect(plano.jornadaExigivelMinutos).toBe(360);
    expect(plano.minutosReconhecidosComoExercicio).toBe(120);
    expect(plano.ocorrenciasAplicadas).toEqual(["horario-reduzido", "abono-parcial"]);
  });

  it("e deterministico independentemente da ordem de entrada", () => {
    const ocorrencias = [
      { id: "b", prioridade: 20, inicio: dia("2026-10-13"), fim: dia("2026-10-13"), efeito: { tipo: "REDUZ_CARGA" as const, minutos: 60 } },
      { id: "a", prioridade: 10, inicio: dia("2026-10-13"), fim: dia("2026-10-13"), efeito: { tipo: "DEFINE_CARGA" as const, minutos: 480 } },
    ];
    const base = { dataReferencia: dia("2026-10-13"), cargaPadraoMinutos: 420 };
    expect(planejarDia({ ...base, ocorrencias })).toEqual(
      planejarDia({ ...base, ocorrencias: [...ocorrencias].reverse() }),
    );
  });
});

