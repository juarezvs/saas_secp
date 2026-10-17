import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ buscar: vi.fn(), transacao: vi.fn() }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {
  autorizacaoHoraExtraAdministrativa: { findUnique: mocks.buscar }, $transaction: mocks.transacao,
} }));

import { calcularAutorizacaoHorasExtras } from "./calcular-autorizacao-horas-extras.service";

describe("isolamento de orgao antes da consulta salarial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buscar.mockResolvedValue({ orgaoId: "orgao-a", status: "VIGENTE" });
  });

  it.each([{ orgaoIds: [] }, { orgaoIds: ["orgao-b"] }])("nega escopo restrito %j antes de consultar remuneracao", async ({ orgaoIds }) => {
    const consultar = vi.fn();
    await expect(calcularAutorizacaoHorasExtras({
      autorizacaoId: "autorizacao-a", escopo: { global: false, orgaoIds },
      remuneracaoProvider: { obterVigenciasRemuneratorias: consultar },
    })).rejects.toThrow(/fora do escopo/);
    expect(consultar).not.toHaveBeenCalled();
    expect(mocks.transacao).not.toHaveBeenCalled();
  });

  it.each([
    { global: true, orgaoIds: [] },
    { global: false, orgaoIds: ["orgao-a"] },
  ])("aceita o escopo correto e ainda exige atesto", async (escopo) => {
    await expect(calcularAutorizacaoHorasExtras({
      autorizacaoId: "autorizacao-a", escopo,
      remuneracaoProvider: { obterVigenciasRemuneratorias: vi.fn() },
    })).rejects.toThrow(/Somente autorizacoes atestadas/);
  });
});
