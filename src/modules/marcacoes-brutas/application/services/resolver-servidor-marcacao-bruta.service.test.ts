import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  equipamentoBiometrico: {
    findUnique: vi.fn(),
  },
  servidor: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: prismaMock,
}));

import { resolverServidorMarcacaoBrutaService } from "./resolver-servidor-marcacao-bruta.service";

describe("resolverServidorMarcacaoBrutaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prioriza CPF e ignora matricula divergente quando o CPF localiza servidor", async () => {
    prismaMock.equipamentoBiometrico.findUnique.mockResolvedValue({
      orgaoId: "orgao-am",
      orgao: { sigla: "SJAM" },
      unidade: null,
    });
    prismaMock.servidor.findFirst.mockResolvedValueOnce({
      id: "servidor-cpf",
      matricula: "AM200401",
      cpf: "12345678901",
    });

    const servidor = await resolverServidorMarcacaoBrutaService({
      cpf: "123.456.789-01",
      matricula: "999999",
      equipamentoId: "equipamento-1",
    });

    expect(servidor?.id).toBe("servidor-cpf");
    expect(prismaMock.servidor.findFirst).toHaveBeenCalledTimes(1);
    expect(prismaMock.servidor.findFirst.mock.calls[0]?.[0].where.OR).toEqual([
      { cpf: "12345678901" },
      { usuario: { cpf: "12345678901" } },
    ]);
  });

  it("nao usa matricula como fallback quando CPF informado nao localiza servidor", async () => {
    prismaMock.equipamentoBiometrico.findUnique.mockResolvedValue({
      orgaoId: "orgao-am",
      orgao: { sigla: "SJAM" },
      unidade: null,
    });
    prismaMock.servidor.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const servidor = await resolverServidorMarcacaoBrutaService({
      cpf: "12345678901",
      matricula: "200401",
      equipamentoId: "equipamento-1",
    });

    expect(servidor).toBeNull();
    expect(prismaMock.servidor.findFirst).toHaveBeenCalledTimes(2);
    expect(prismaMock.servidor.findFirst.mock.calls[1]?.[0].where.OR).toEqual([
      { cpf: "12345678901" },
      { usuario: { cpf: "12345678901" } },
    ]);
  });

  it("normaliza matricula numerica pelo orgao do equipamento", async () => {
    prismaMock.equipamentoBiometrico.findUnique.mockResolvedValue({
      orgaoId: "orgao-am",
      orgao: { sigla: "SJAM" },
      unidade: null,
    });
    prismaMock.servidor.findFirst.mockResolvedValueOnce({
      id: "servidor-am",
      matricula: "AM200401",
      cpf: "12345678901",
    });

    const servidor = await resolverServidorMarcacaoBrutaService({
      matricula: "000200401",
      equipamentoId: "equipamento-1",
    });

    expect(servidor?.matricula).toBe("AM200401");
    expect(prismaMock.servidor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgaoId: "orgao-am",
          OR: [
            {
              usuario: {
                matricula: { equals: "AM200401", mode: "insensitive" },
              },
            },
            { matricula: { equals: "AM200401", mode: "insensitive" } },
          ],
        }),
      }),
    );
  });

  it("resolve servidor por PIS dentro do orgao do equipamento", async () => {
    prismaMock.equipamentoBiometrico.findUnique.mockResolvedValue({
      orgaoId: "orgao-ma",
      orgao: { sigla: "SJMA" },
      unidade: null,
    });
    prismaMock.servidor.findFirst.mockResolvedValueOnce({
      id: "servidor-pis",
      matricula: "MA9203",
      cpf: "50526596368",
      pis: "17050352959",
    });

    const servidor = await resolverServidorMarcacaoBrutaService({
      pis: "017050352959",
      equipamentoId: "equipamento-1",
    });

    expect(servidor?.id).toBe("servidor-pis");
    expect(prismaMock.servidor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ativo: true,
          orgaoId: "orgao-ma",
          pis: "17050352959",
        }),
      }),
    );
  });

  it("nao resolve matricula numerica global sem orgao do equipamento", async () => {
    prismaMock.equipamentoBiometrico.findUnique.mockResolvedValue(null);

    const servidor = await resolverServidorMarcacaoBrutaService({
      matricula: "200401",
      equipamentoId: "equipamento-inexistente",
    });

    expect(servidor).toBeNull();
    expect(prismaMock.servidor.findFirst).not.toHaveBeenCalled();
  });
});
