import { describe, expect, it } from "vitest";

import { selecionarBaseRemuneratoriaContracheque } from "./base-remuneratoria-contracheque.service";

describe("base remuneratoria explicita de horas extras", () => {
  it("bloqueia o uso automatico do bruto quando nao existem rubricas configuradas", () => {
    expect(() => selecionarBaseRemuneratoriaContracheque([
      { codigo: 1, tipo: "R", valor: 8000 },
      { codigo: 2, tipo: "R", valor: 2666.67 },
    ], new Set())).toThrow(/total bruto/);
  });

  it("inclui apenas rendimentos selecionados, sem deduzir descontos ou incluir outras verbas", () => {
    const rubricas = [
      { codigo: 1, tipo: "R", valor: 8000 },
      { codigo: 2, tipo: "R", valor: 2666.67 },
      { codigo: 3, tipo: "R", valor: 8000 },
      { codigo: 4, tipo: "D", valor: 1000 },
    ];
    const resultado = selecionarBaseRemuneratoriaContracheque(rubricas, new Set(["1", "4"]));
    expect(resultado.centavos).toBe(800000);
    expect(resultado.rubricasUsadas).toEqual([rubricas[0]]);
    expect(resultado.criterio).toBe("RUBRICAS_CONFIGURADAS");
  });

  it("soma rubricas em decimal antes de converter para centavos", () => {
    const resultado = selecionarBaseRemuneratoriaContracheque([
      { codigo: 1, tipo: "R", valor: 0.1 },
      { codigo: 2, tipo: "R", valor: 0.2 },
    ], new Set(["1", "2"]));
    expect(resultado.centavos).toBe(30);
  });

  it.each([NaN, Infinity])("bloqueia rubrica com valor nao finito: %s", (valor) => {
    expect(() => selecionarBaseRemuneratoriaContracheque([
      { codigo: 1, tipo: "R", valor },
    ], new Set(["1"]))).toThrow(/invalido/);
  });

  it("bloqueia selecao ausente no contracheque e base nao positiva", () => {
    expect(() => selecionarBaseRemuneratoriaContracheque([], new Set(["1"]))).toThrow(/positiva/);
    expect(() => selecionarBaseRemuneratoriaContracheque([
      { codigo: 1, tipo: "R", valor: -1 },
    ], new Set(["1"]))).toThrow(/positiva/);
  });
});
