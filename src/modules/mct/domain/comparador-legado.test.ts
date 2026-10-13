import { describe, expect, it } from "vitest";
import { compararMctComLegado } from "./comparador-legado";

const mct = {
  jornadaPrevistaMinutos: 420,
  jornadaExigivelMinutos: 420,
  permanenciaBrutaMinutos: 480,
  tempoEfetivamenteTrabalhadoMinutos: 480,
  intervalosNaoComputaveisMinutos: 0,
  tempoComputavelMinutos: 480,
  tempoFaltanteMinutos: 0,
  excedenteBrutoMinutos: 60,
  creditoReconhecidoMinutos: 0,
  debitoReconhecidoMinutos: 0,
  excedentePendenteMinutos: 60,
  jornadaCompletadaEm: new Date("2026-10-13T19:00:00Z"),
};

describe("compararMctComLegado", () => {
  it("nao reporta divergencia para valores equivalentes", () => {
    const resultado = compararMctComLegado({
      legado: {
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 480,
        minutosCredito: 0,
        minutosDebito: 0,
        resultado: "REGULAR",
        status: "CALCULADA",
      },
      mct,
    });
    expect(resultado.totalDivergencias).toBe(0);
  });

  it("marca divergencia de saldo como critica sem alterar o legado", () => {
    const resultado = compararMctComLegado({
      legado: {
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 480,
        minutosCredito: 60,
        minutosDebito: 0,
        resultado: "CREDITO",
        status: "CALCULADA",
      },
      mct,
    });
    expect(resultado).toMatchObject({
      totalDivergencias: 1,
      possuiDivergenciaCritica: true,
      divergencias: [
        { campo: "CREDITO", legadoMinutos: 60, mctMinutos: 0, severidade: "CRITICA" },
      ],
    });
  });
});

