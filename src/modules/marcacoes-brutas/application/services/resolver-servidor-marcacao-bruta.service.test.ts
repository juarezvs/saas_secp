import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  equipamentoBiometrico: {
    findUnique: vi.fn(),
  },
  identificadorPontoServidor: {
    findFirst: vi.fn(),
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
    prismaMock.identificadorPontoServidor.findFirst.mockResolvedValue(null);
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
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const servidor = await resolverServidorMarcacaoBrutaService({
      cpf: "12345678901",
      matricula: "200401",
      equipamentoId: "equipamento-1",
    });

    expect(servidor).toBeNull();
    expect(prismaMock.servidor.findFirst).toHaveBeenCalledTimes(4);
    expect(prismaMock.servidor.findFirst.mock.calls[1]?.[0].where.OR).toEqual([
      { cpf: "12345678901" },
      { usuario: { cpf: "12345678901" } },
    ]);
    expect(prismaMock.servidor.findFirst.mock.calls[2]?.[0].where).toEqual(
      expect.objectContaining({
        orgaoId: "orgao-am",
        pis: "12345678901",
      }),
    );
  });

  it("usa CPF recebido como candidato a PIS quando nao encontra servidor por CPF", async () => {
    prismaMock.equipamentoBiometrico.findUnique.mockResolvedValue({
      orgaoId: "orgao-ma",
      orgao: { sigla: "SJMA" },
      unidade: null,
    });
    prismaMock.servidor.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "servidor-pis-campo-cpf",
        matricula: "MA8500125",
        cpf: "00000000000",
        pis: "17050352959",
      });

    const servidor = await resolverServidorMarcacaoBrutaService({
      cpf: "17050352959",
      equipamentoId: "equipamento-sjma",
    });

    expect(servidor?.id).toBe("servidor-pis-campo-cpf");
    expect(prismaMock.servidor.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ativo: true,
          orgaoId: "orgao-ma",
          pis: "17050352959",
        }),
      }),
    );
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

  it("normaliza matricula numerica de Roraima removendo zeros a esquerda", async () => {
    prismaMock.equipamentoBiometrico.findUnique.mockResolvedValue({
      orgaoId: "orgao-rr",
      orgao: { sigla: "SJRR" },
      unidade: null,
      configuracao: {
        identificadorCpf: true,
        identificadorMatriculaNumerica: true,
      },
    });
    prismaMock.servidor.findFirst.mockResolvedValueOnce({
      id: "servidor-rr",
      matricula: "RR1235",
      cpf: "12345678901",
    });

    const servidor = await resolverServidorMarcacaoBrutaService({
      matricula: "000001235",
      equipamentoId: "equipamento-rr",
    });

    expect(servidor?.matricula).toBe("RR1235");
    expect(prismaMock.servidor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgaoId: "orgao-rr",
          OR: [
            {
              usuario: {
                matricula: { equals: "RR1235", mode: "insensitive" },
              },
            },
            { matricula: { equals: "RR1235", mode: "insensitive" } },
          ],
        }),
      }),
    );
  });

  it("resolve matricula numerica pelo identificador com prefixo do orgao", async () => {
    prismaMock.equipamentoBiometrico.findUnique.mockResolvedValue({
      orgaoId: "orgao-rr",
      orgao: { sigla: "SJRR" },
      unidade: null,
      configuracao: {
        identificadorMatriculaNumerica: true,
      },
    });
    prismaMock.identificadorPontoServidor.findFirst.mockResolvedValueOnce({
      servidor: {
        id: "servidor-rr-identificador",
        matricula: "RR20011",
        cpf: "12345678901",
        pis: null,
      },
    });

    const servidor = await resolverServidorMarcacaoBrutaService({
      matricula: "00000000000000006248",
      equipamentoId: "equipamento-rr",
    });

    expect(servidor?.id).toBe("servidor-rr-identificador");
    expect(prismaMock.identificadorPontoServidor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          valorNormalizado: { in: ["00000000000000006248", "RR6248"] },
          servidor: expect.objectContaining({
            orgaoId: "orgao-rr",
          }),
        }),
      }),
    );
    expect(prismaMock.servidor.findFirst).not.toHaveBeenCalled();
  });

  it("nao normaliza matricula numerica quando equipamento desabilita esse identificador", async () => {
    prismaMock.equipamentoBiometrico.findUnique.mockResolvedValue({
      orgaoId: "orgao-rr",
      orgao: { sigla: "SJRR" },
      unidade: null,
      configuracao: {
        identificadorCpf: true,
        identificadorMatriculaNumerica: false,
      },
    });

    const servidor = await resolverServidorMarcacaoBrutaService({
      matricula: "000001235",
      equipamentoId: "equipamento-rr",
    });

    expect(servidor).toBeNull();
    expect(prismaMock.servidor.findFirst).not.toHaveBeenCalled();
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
