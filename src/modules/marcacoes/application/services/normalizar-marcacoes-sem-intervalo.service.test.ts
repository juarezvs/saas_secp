import { describe, expect, it, vi } from "vitest";

import { normalizarMarcacoesSemIntervaloService } from "./normalizar-marcacoes-sem-intervalo.service";

function criarMarcacao(id: string, dataHora: string, tipo: string) {
  return {
    id,
    dataHora: new Date(dataHora),
    tipo,
    fonte: "EQUIPAMENTO_BIOMETRICO",
  };
}

describe("normalizarMarcacoesSemIntervalo", () => {
  it("classifica entrada e saida pela ordem cronologica", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const client = { marcacao: { update } };
    const marcacoes = [
      criarMarcacao("saida", "2026-04-13T15:59:00.000Z", "ENTRADA"),
      criarMarcacao("entrada", "2026-04-13T12:19:00.000Z", "SAIDA"),
    ];

    const resultado = await normalizarMarcacoesSemIntervaloService(
      client as never,
      marcacoes,
    );

    expect(resultado.map(({ id, tipo }) => ({ id, tipo }))).toEqual([
      { id: "saida", tipo: "SAIDA" },
      { id: "entrada", tipo: "ENTRADA" },
    ]);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("preserva quatro marcacoes quando houver intervalo no dia", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const client = { marcacao: { update } };
    const marcacoes = [
      criarMarcacao("entrada", "2026-04-13T12:00:00.000Z", "ENTRADA"),
      criarMarcacao(
        "saida-intervalo",
        "2026-04-13T16:00:00.000Z",
        "ENTRADA",
      ),
      criarMarcacao(
        "retorno-intervalo",
        "2026-04-13T17:00:00.000Z",
        "ENTRADA",
      ),
      criarMarcacao("saida", "2026-04-13T21:00:00.000Z", "ENTRADA"),
    ];

    const resultado = await normalizarMarcacoesSemIntervaloService(
      client as never,
      marcacoes,
    );

    expect(resultado.map(({ id, tipo }) => ({ id, tipo }))).toEqual([
      { id: "entrada", tipo: "ENTRADA" },
      { id: "saida-intervalo", tipo: "SAIDA_INTERVALO" },
      { id: "retorno-intervalo", tipo: "RETORNO_INTERVALO" },
      { id: "saida", tipo: "SAIDA" },
    ]);
    expect(update).toHaveBeenCalledTimes(3);
  });
});
