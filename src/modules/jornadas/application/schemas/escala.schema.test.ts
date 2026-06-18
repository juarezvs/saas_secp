import { describe, expect, it } from "vitest";

import { diasSemana, escalaSchema } from "./escala.schema";

const escalaBase = {
  jornadaId: "0a50a002-0fef-435d-b74c-6b4ef03539af",
  codigo: "ESCALA_TESTE",
  nome: "Escala de teste",
  descricao: "",
  tipo: "SEMANAL",
  ativo: true,
  dias: diasSemana.map((diaSemana) => ({
    diaSemana,
    trabalha: diaSemana !== "DOMINGO" && diaSemana !== "SABADO",
    horarioEntrada: "08:00",
    horarioSaida: "15:00",
    intervaloInicio: "",
    intervaloFim: "",
    cargaPrevistaMinutos: diaSemana !== "DOMINGO" && diaSemana !== "SABADO"
      ? 420
      : 0,
  })),
};

describe("escalaSchema", () => {
  it("aceita cadastro de escala semanal com dias trabalhados", () => {
    const resultado = escalaSchema.safeParse(escalaBase);

    expect(resultado.success).toBe(true);
  });

  it("aceita os tipos individual e revezamento", () => {
    expect(escalaSchema.safeParse({ ...escalaBase, tipo: "INDIVIDUAL" }).success)
      .toBe(true);
    expect(
      escalaSchema.safeParse({ ...escalaBase, tipo: "REVEZAMENTO" }).success,
    ).toBe(true);
  });

  it("exige pelo menos um dia trabalhado", () => {
    const resultado = escalaSchema.safeParse({
      ...escalaBase,
      dias: escalaBase.dias.map((dia) => ({
        ...dia,
        trabalha: false,
        cargaPrevistaMinutos: 0,
      })),
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.dias?.[0]).toContain(
        "pelo menos um dia",
      );
    }
  });
});
