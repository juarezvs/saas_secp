import { describe, expect, it } from "vitest";
import { normalizarEventosTemporais } from "./normalizador-temporal";

describe("normalizarEventosTemporais", () => {
  it("preserva o original e marca duplicidades sem duplicar tempo", () => {
    const instante = new Date("2026-10-13T08:00:00-04:00");
    const resultado = normalizarEventosTemporais([
      { id: "entrada-2", ocorridoEm: instante, tipo: "ENTRADA", fonte: "WEB" },
      { id: "entrada-1", ocorridoEm: instante, tipo: "ENTRADA", fonte: "REP" },
      {
        id: "saida-1",
        ocorridoEm: new Date("2026-10-13T15:00:00-04:00"),
        tipo: "SAIDA",
        fonte: "REP",
      },
    ]);

    expect(resultado.eventos).toHaveLength(3);
    expect(resultado.eventos.filter((evento) => evento.duplicadoDe)).toHaveLength(1);
    expect(resultado.intervalosTrabalhados).toHaveLength(1);
    expect(resultado.pendencias.map((item) => item.codigo)).toContain("EVENTO_DUPLICADO");
  });

  it("suporta jornada atravessando a meia-noite", () => {
    const resultado = normalizarEventosTemporais([
      {
        id: "entrada",
        ocorridoEm: new Date("2026-10-13T20:00:00-04:00"),
        tipo: "ENTRADA",
        fonte: "REP",
      },
      {
        id: "saida",
        ocorridoEm: new Date("2026-10-14T08:00:00-04:00"),
        tipo: "SAIDA",
        fonte: "REP",
      },
    ]);

    const intervalo = resultado.intervalosTrabalhados[0];
    expect((intervalo.fim.getTime() - intervalo.inicio.getTime()) / 60_000).toBe(720);
    expect(resultado.pendencias).toEqual([]);
  });

  it("produz pendencia em vez de inventar uma saida", () => {
    const resultado = normalizarEventosTemporais([
      {
        id: "entrada",
        ocorridoEm: new Date("2026-10-13T08:00:00-04:00"),
        tipo: "ENTRADA",
        fonte: "REP",
      },
    ]);

    expect(resultado.intervalosTrabalhados).toEqual([]);
    expect(resultado.pendencias).toEqual([
      expect.objectContaining({ codigo: "ENTRADA_SEM_SAIDA" }),
    ]);
  });
});

