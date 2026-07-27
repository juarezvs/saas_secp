import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/shared/infrastructure/database/prisma";

import { verificarPeriodoHomologado } from "./bloquear-periodo-homologado.service";

vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    homologacaoServidorMes: {
      findFirst: vi.fn(),
    },
  },
}));

const findFirstMock = vi.mocked(prisma.homologacaoServidorMes.findFirst);

describe("verificarPeriodoHomologado", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("calcula a competência pela data civil UTC da referência", async () => {
    findFirstMock.mockResolvedValue(null);

    const resultado = await verificarPeriodoHomologado({
      servidorId: "servidor-1",
      dataReferencia: new Date("2026-07-01T00:00:00.000Z"),
    });

    expect(resultado).toMatchObject({
      bloqueado: false,
      anoReferencia: 2026,
      mesReferencia: 7,
    });
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fechamento: {
            anoReferencia: 2026,
            mesReferencia: 7,
          },
        }),
      }),
    );
  });
});
