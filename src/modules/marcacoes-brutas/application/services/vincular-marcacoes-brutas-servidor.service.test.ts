import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  marcacaoBruta: {
    findMany: vi.fn(),
  },
}));

const processarMarcacaoBrutaServiceMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("./processar-marcacao-bruta.service", () => ({
  processarMarcacaoBrutaService: processarMarcacaoBrutaServiceMock,
}));

import { vincularMarcacoesBrutasServidorService } from "./vincular-marcacoes-brutas-servidor.service";

describe("vincularMarcacoesBrutasServidorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processa marcacao bruta pendente ja vinculada ao servidor", async () => {
    prismaMock.marcacaoBruta.findMany
      .mockResolvedValueOnce([
        {
          id: "bruta-1",
          servidorId: "servidor-1",
          cpf: "12345678901",
          pis: null,
          matricula: "12345678901",
        },
      ])
      .mockResolvedValueOnce([]);
    processarMarcacaoBrutaServiceMock.mockResolvedValue({
      sucesso: true,
      marcacaoId: "marcacao-1",
    });

    const resultado = await vincularMarcacoesBrutasServidorService({
      servidorId: "servidor-1",
      cpf: "12345678901",
      matricula: "AC123",
      identificadores: ["99887766"],
    });

    expect(prismaMock.marcacaoBruta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          processada: false,
          OR: expect.arrayContaining([{ servidorId: "servidor-1" }]),
        }),
      }),
    );
    expect(processarMarcacaoBrutaServiceMock).toHaveBeenCalledWith({
      marcacaoBrutaId: "bruta-1",
      usuarioIdAuditoria: undefined,
    });
    expect(resultado).toMatchObject({
      total: 1,
      processadas: 1,
      aindaPendentes: 0,
      erros: 0,
    });
  });
});
