import { describe, expect, it } from "vitest";

import { jornadaSchema } from "./jornada.schema";

const jornadaBase = {
  codigo: "JORNADA_TESTE",
  nome: "Jornada de teste",
  descricao: "",
  tipo: "SETE_HORAS",
  cargaDiariaMinutos: 420,
  exigeIntervalo: false,
  intervaloMinimoMinutos: null,
  intervaloMaximoMinutos: null,
  horarioEntradaPadrao: "08:00",
  horarioSaidaPadrao: "15:00",
  horarioDiferenciadoPermitido: false,
  entradaMinimaDiferenciada: "",
  saidaMaximaDiferenciada: "",
  ativo: true,
};

describe("jornadaSchema", () => {
  it("aceita jornada especial com fundamento legal ou normativo", () => {
    const resultado = jornadaSchema.safeParse({
      ...jornadaBase,
      codigo: "JORNADA_ASSISTENTE_SOCIAL",
      nome: "Assistente social",
      descricao: "Jornada especial fundamentada na Lei 12.317/2010.",
      tipo: "ESPECIAL",
      cargaDiariaMinutos: 360,
      horarioSaidaPadrao: "14:00",
    });

    expect(resultado.success).toBe(true);
  });

  it("rejeita jornada especial sem fundamento legal ou normativo", () => {
    const resultado = jornadaSchema.safeParse({
      ...jornadaBase,
      codigo: "JORNADA_ESPECIAL",
      nome: "Jornada especial",
      descricao: "Jornada especial reduzida.",
      tipo: "ESPECIAL",
      cargaDiariaMinutos: 360,
      horarioSaidaPadrao: "14:00",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.flatten().fieldErrors.fundamentoNormativo?.[0],
      ).toContain("fundamento legal/normativo");
    }
  });

  it("mantem a exigencia de intervalo para jornada de 8 horas", () => {
    const resultado = jornadaSchema.safeParse({
      ...jornadaBase,
      codigo: "JORNADA_8H",
      nome: "Jornada 8h",
      tipo: "OITO_HORAS",
      cargaDiariaMinutos: 480,
      horarioSaidaPadrao: "16:00",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.exigeIntervalo?.[0]).toBe(
        "Jornada de 8 horas deve exigir intervalo.",
      );
    }
  });

  it("aceita escala ciclica de 24 horas com entrada e saida no mesmo horario", () => {
    const resultado = jornadaSchema.safeParse({
      ...jornadaBase,
      codigo: "ESCALA_24X72",
      nome: "Escala 24x72",
      tipo: "ESCALA_CICLICA",
      cargaDiariaMinutos: 1440,
      cargaSemanalMinutos: 1440,
      cargaMensalMinutos: 10800,
      horarioEntradaPadrao: "08:00",
      horarioSaidaPadrao: "08:00",
      cruzaMeiaNoite: true,
      dias: [
        {
          ordemNoCiclo: 1,
          tipoDia: "TRABALHO",
          cargaPrevistaMinutos: 1440,
          faixas: [
            {
              tipo: "TRABALHO",
              horaInicio: "08:00",
              horaFim: "08:00",
              obrigatoria: true,
              cruzaMeiaNoite: true,
              ordem: 1,
            },
          ],
        },
        {
          ordemNoCiclo: 2,
          tipoDia: "FOLGA",
          cargaPrevistaMinutos: 0,
          faixas: [],
        },
        {
          ordemNoCiclo: 3,
          tipoDia: "FOLGA",
          cargaPrevistaMinutos: 0,
          faixas: [],
        },
        {
          ordemNoCiclo: 4,
          tipoDia: "FOLGA",
          cargaPrevistaMinutos: 0,
          faixas: [],
        },
      ],
    });

    expect(resultado.success).toBe(true);
  });
});
