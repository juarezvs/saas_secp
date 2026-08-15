import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  marcacaoBruta: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  auditoriaEvento: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async (callback) => callback(prismaMock)),
}));

vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: prismaMock,
}));

import { criarMarcacaoBrutaService } from "./criar-marcacao-bruta.service";

describe("criarMarcacaoBrutaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("corrige marcacao bruta existente do mesmo evento fisico quando a nova leitura traz CPF/PIS correto", async () => {
    const dataHora = new Date("2025-12-02T19:36:00.000Z");
    const existente = {
      id: "bruta-1",
      cpf: "05052659636",
      pis: null,
      matricula: null,
      servidorId: null,
      marcacaoId: null,
      processada: false,
      processadaEm: null,
      dataHora,
      equipamentoCodigo: "SJMA_ControlID_idClass_Bio",
      equipamentoId: "equipamento-1",
      arquivoAfdId: null,
      origem: "EQUIPAMENTO_BIOMETRICO",
      nsr: "3180",
      codigoExterno: "3180",
      hashRegistro: "hash-antigo",
      payloadOriginal: {
        identificadorAfd: "05052659636",
      },
      criadoEm: new Date("2026-07-21T10:00:00.000Z"),
    };
    const atualizada = {
      ...existente,
      cpf: "50526596368",
      pis: null,
      hashRegistro: "hash-novo",
    };

    prismaMock.marcacaoBruta.findUnique.mockResolvedValue(null);
    prismaMock.marcacaoBruta.findFirst.mockResolvedValue(existente);
    prismaMock.marcacaoBruta.update.mockResolvedValue(atualizada);

    const resultado = await criarMarcacaoBrutaService({
      cpf: "50526596368",
      pis: null,
      matricula: null,
      dataHora,
      equipamentoCodigo: "SJMA_ControlID_idClass_Bio",
      equipamentoId: "equipamento-1",
      origem: "EQUIPAMENTO_BIOMETRICO",
      nsr: "3180",
      codigoExterno: "3180",
      payloadOriginal: {
        identificadorAfd: "050526596368",
      },
    });

    expect(resultado).toMatchObject({
      criada: false,
      corrigida: true,
      marcacaoBruta: atualizada,
    });
    expect(prismaMock.marcacaoBruta.create).not.toHaveBeenCalled();
    expect(prismaMock.marcacaoBruta.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bruta-1" },
        data: expect.objectContaining({
          cpf: "50526596368",
          pis: null,
          matricula: null,
          processada: false,
          processadaEm: null,
        }),
      }),
    );
    expect(prismaMock.auditoriaEvento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entidade: "MarcacaoBruta",
          entidadeId: "bruta-1",
          acao: "MARCACAO_BRUTA_IDENTIFICACAO_AUTOCORRIGIDA",
        }),
      }),
    );
  });

  it("retorna marcacao existente quando a criacao encontra hash duplicado", async () => {
    const dataHora = new Date("2026-01-29T12:00:00.000Z");
    const existente = {
      id: "bruta-duplicada",
      cpf: null,
      pis: null,
      matricula: "1",
      servidorId: null,
      marcacaoId: null,
      processada: false,
      processadaEm: null,
      dataHora,
      equipamentoCodigo: "SJAC_BIO_T_172_17_250_34",
      equipamentoId: "equipamento-34",
      arquivoAfdId: null,
      origem: "EQUIPAMENTO_BIOMETRICO",
      nsr: "1",
      codigoExterno: "1",
      hashRegistro: "hash-duplicado",
      payloadOriginal: {},
      criadoEm: new Date("2026-08-14T10:00:00.000Z"),
    };

    prismaMock.marcacaoBruta.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existente);
    prismaMock.marcacaoBruta.findFirst.mockResolvedValue(null);
    prismaMock.marcacaoBruta.create.mockRejectedValue({
      code: "P2002",
      meta: {
        target: ["hash_registro"],
      },
    });

    const resultado = await criarMarcacaoBrutaService({
      matricula: "1",
      dataHora,
      equipamentoCodigo: "SJAC_BIO_T_172_17_250_34",
      equipamentoId: "equipamento-34",
      origem: "EQUIPAMENTO_BIOMETRICO",
      nsr: "1",
      codigoExterno: "1",
    });

    expect(resultado).toMatchObject({
      criada: false,
      marcacaoBruta: existente,
    });
  });
});
