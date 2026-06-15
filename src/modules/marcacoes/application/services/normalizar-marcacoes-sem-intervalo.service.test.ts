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
  it("classifica entrada e saída pela ordem cronológica", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const client = { marcacao: { update } };
    const marcacoes = [
      criarMarcacao(
        "saida",
        "2026-04-13T15:59:00.000Z",
        "ENTRADA",
      ),
      criarMarcacao(
        "entrada",
        "2026-04-13T12:19:00.000Z",
        "SAIDA",
      ),
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
});
