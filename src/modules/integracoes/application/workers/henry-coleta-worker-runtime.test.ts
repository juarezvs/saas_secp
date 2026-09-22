import { describe, expect, it } from "vitest";

import {
  agruparEquipamentosPorSeccional,
  erroColetaTemporario,
  executarComConcorrenciaLimitada,
} from "./henry-coleta-worker-runtime";

describe("erroColetaTemporario", () => {
  it.each([
    "Status Henry 050",
    "Status Henry 102",
    "Status Henry REP Web Server 103",
    "Equipamento ocupado por outra coleta em execucao",
  ])("nao penaliza o equipamento para %s", (mensagem) => {
    expect(erroColetaTemporario(new Error(mensagem))).toBe(true);
  });

  it("mantem timeout de rede elegivel para suspensao", () => {
    expect(erroColetaTemporario(new Error("Tempo limite ao conectar"))).toBe(false);
  });
});

describe("agruparEquipamentosPorSeccional", () => {
  it("cria automaticamente um escopo para cada orgao", () => {
    const base = { nome: "Relogio", ip: "10.0.0.1", unidade: null };
    const escopos = agruparEquipamentosPorSeccional([
      { ...base, id: "1", codigo: "SJAM-1", orgaoId: "am", orgao: { sigla: "SJAM" } },
      { ...base, id: "2", codigo: "SJRR-1", orgaoId: "rr", orgao: { sigla: "SJRR" } },
      { ...base, id: "3", codigo: "SJAM-2", orgaoId: "am", orgao: { sigla: "SJAM" } },
    ]);

    expect(escopos.map((item) => [item.sigla, item.equipamentos.length])).toEqual([
      ["SJAM", 2],
      ["SJRR", 1],
    ]);
  });

  it("usa o orgao da unidade quando nao ha vinculacao direta", () => {
    const [escopo] = agruparEquipamentosPorSeccional([
      {
        id: "1",
        codigo: "SJXX-1",
        nome: "Relogio",
        ip: "10.0.0.1",
        orgaoId: null,
        orgao: null,
        unidade: { orgaoId: "xx", orgao: { sigla: "SJXX" } },
      },
    ]);

    expect(escopo.sigla).toBe("SJXX");
    expect(escopo.orgaoId).toBe("xx");
  });
});

describe("executarComConcorrenciaLimitada", () => {
  it("processa todos os itens sem ultrapassar o limite", async () => {
    let emExecucao = 0;
    let maximoSimultaneo = 0;
    const processados: number[] = [];

    await executarComConcorrenciaLimitada([1, 2, 3, 4, 5], 2, async (item) => {
      emExecucao += 1;
      maximoSimultaneo = Math.max(maximoSimultaneo, emExecucao);
      await new Promise((resolve) => setTimeout(resolve, 5));
      processados.push(item);
      emExecucao -= 1;
    });

    expect(maximoSimultaneo).toBe(2);
    expect(processados.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("aceita uma lista vazia", async () => {
    await expect(
      executarComConcorrenciaLimitada([], 2, async () => undefined),
    ).resolves.toBeUndefined();
  });
});
