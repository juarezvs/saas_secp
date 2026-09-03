import { describe, expect, it } from "vitest";

import {
  LIMITE_MARCACOES_DIARIAS,
  classificarProximaMarcacao,
  contarMarcacoesDiarias,
} from "./classificar-marcacao.service";

function marcacao(tipo: string, hora: string) {
  return {
    tipo,
    dataHora: new Date(`2026-09-03T${hora}:00.000Z`),
  };
}

describe("classificarProximaMarcacao", () => {
  it("permite ate 6 marcacoes diarias em jornada com intervalo", () => {
    const marcacoesDoDia = [
      marcacao("ENTRADA", "08:00"),
      marcacao("SAIDA_INTERVALO", "12:00"),
      marcacao("RETORNO_INTERVALO", "13:00"),
      marcacao("SAIDA", "17:00"),
      marcacao("MANUAL", "18:00"),
    ];

    expect(contarMarcacoesDiarias(marcacoesDoDia)).toBe(5);
    expect(
      classificarProximaMarcacao({
        marcacoesDoDia,
        exigeIntervalo: true,
      }),
    ).toMatchObject({
      tipo: "MANUAL",
      ordem: 6,
      descricao: "Saida adicional",
    });
  });

  it("bloqueia a setima marcacao diaria", () => {
    const marcacoesDoDia = [
      marcacao("ENTRADA", "08:00"),
      marcacao("SAIDA_INTERVALO", "12:00"),
      marcacao("RETORNO_INTERVALO", "13:00"),
      marcacao("SAIDA", "17:00"),
      marcacao("MANUAL", "18:00"),
      marcacao("MANUAL", "19:00"),
    ];

    expect(contarMarcacoesDiarias(marcacoesDoDia)).toBe(
      LIMITE_MARCACOES_DIARIAS,
    );
    expect(() =>
      classificarProximaMarcacao({
        marcacoesDoDia,
        exigeIntervalo: true,
      }),
    ).toThrow("Limite diario de 6 marcacoes atingido");
  });

  it("permite tres entradas e tres saidas em jornada sem intervalo", () => {
    const marcacoesDoDia = [
      marcacao("ENTRADA", "08:00"),
      marcacao("SAIDA", "10:00"),
      marcacao("MANUAL", "11:00"),
      marcacao("MANUAL", "12:00"),
    ];

    expect(
      classificarProximaMarcacao({
        marcacoesDoDia,
        exigeIntervalo: false,
      }),
    ).toMatchObject({
      tipo: "MANUAL",
      ordem: 5,
      descricao: "Entrada adicional",
    });
  });
});
