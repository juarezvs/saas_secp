import { afterEach, describe, expect, it, vi } from "vitest";

const tx = {
  cidade: { deleteMany: vi.fn(), createMany: vi.fn() },
  estado: { deleteMany: vi.fn(), createMany: vi.fn() },
};

vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (cliente: typeof tx) => unknown) =>
      callback(tx),
    ),
  },
}));

import { sincronizarLocalidadesIbgeService } from "./sincronizar-localidades-ibge.service";

describe("sincronizarLocalidadesIbgeService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("carrega estados, regioes e cidades usando os codigos oficiais", async () => {
    const respostas = [
      [
        { id: 13, sigla: "AM", nome: "Amazonas", regiao: { id: 1, sigla: "N", nome: "Norte" } },
        { id: 14, sigla: "RR", nome: "Roraima", regiao: { id: 1, sigla: "N", nome: "Norte" } },
      ],
      [{ id: 1302603, nome: "Manaus" }],
      [{ id: 1400100, nome: "Boa Vista" }],
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => respostas.shift() })),
    );

    await expect(sincronizarLocalidadesIbgeService()).resolves.toEqual({
      estados: 2,
      cidades: 2,
    });
    expect(tx.estado.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 13, sigla: "AM", regiaoNome: "Norte" }),
      ]),
    });
    expect(tx.cidade.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { id: 1302603, estadoId: 13, nome: "Manaus", ativo: true, origem: "SARH" },
      ]),
    });
  });

  it("interrompe a carga quando o IBGE responde com erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 })),
    );

    await expect(sincronizarLocalidadesIbgeService()).rejects.toThrow(
      "IBGE respondeu 503",
    );
    expect(tx.estado.deleteMany).not.toHaveBeenCalled();
  });
});
