import { describe, expect, it, vi } from "vitest";

import { normalizarMarcacoesSemIntervaloService } from "./normalizar-marcacoes-sem-intervalo.service";

function criarMarcacao(
  id: string,
  dataHora: string,
  tipo: string,
  fonte = "EQUIPAMENTO_BIOMETRICO",
) {
  return {
    id,
    dataHora: new Date(dataHora),
    tipo,
    fonte,
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

  it("considera ajuste manual administrativo ao reclassificar dia sem intervalo", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const client = { marcacao: { update } };
    const marcacoes = [
      criarMarcacao(
        "ajuste-entrada",
        "2026-07-24T12:23:00.000Z",
        "ENTRADA",
        "MANUAL_ADMINISTRATIVO",
      ),
      criarMarcacao("biometrica-saida", "2026-07-24T21:32:00.000Z", "ENTRADA"),
    ];

    const resultado = await normalizarMarcacoesSemIntervaloService(
      client as never,
      marcacoes,
    );

    expect(resultado.map(({ id, tipo }) => ({ id, tipo }))).toEqual([
      { id: "ajuste-entrada", tipo: "ENTRADA" },
      { id: "biometrica-saida", tipo: "SAIDA" },
    ]);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: "biometrica-saida" },
      data: { tipo: "SAIDA" },
    });
  });

  it("nao altera marcacao isolada", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const client = { marcacao: { update } };
    const marcacoes = [
      criarMarcacao(
        "ajuste-saida",
        "2026-07-24T21:32:00.000Z",
        "SAIDA",
        "MANUAL_ADMINISTRATIVO",
      ),
    ];

    const resultado = await normalizarMarcacoesSemIntervaloService(
      client as never,
      marcacoes,
    );

    expect(resultado.map(({ id, tipo }) => ({ id, tipo }))).toEqual([
      { id: "ajuste-saida", tipo: "SAIDA" },
    ]);
    expect(update).not.toHaveBeenCalled();
  });
});
