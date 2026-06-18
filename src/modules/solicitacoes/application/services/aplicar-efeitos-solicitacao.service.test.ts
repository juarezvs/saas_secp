import { describe, expect, it, vi } from "vitest";

import { aplicarEfeitosSolicitacaoDeferida } from "./aplicar-efeitos-solicitacao.service";

describe("aplicarEfeitosSolicitacaoDeferida", () => {
  it("registra compensacao de debito autorizada pela chefia", async () => {
    const autorizacaoBancoHoras = {
      upsert: vi.fn().mockResolvedValue({
        id: "autorizacao-1",
        tipo: "COMPENSACAO_DEBITO",
        status: "AUTORIZADA",
        dataInicio: new Date("2026-06-15T08:00:00-04:00"),
        dataFim: new Date("2026-06-15T10:00:00-04:00"),
        minutosAutorizados: 120,
        autorizadoPorUsuarioId: "usuario-chefia",
        autorizadoEm: new Date("2026-06-15T12:00:00-04:00"),
      }),
    };
    const auditoriaEvento = {
      create: vi.fn().mockResolvedValue({ id: "auditoria-1" }),
    };

    const resultado = await aplicarEfeitosSolicitacaoDeferida({
      tx: {
        autorizacaoBancoHoras,
        auditoriaEvento,
      } as never,
      usuarioAnaliseId: "usuario-chefia",
      justificativaAnalise: "Caso fortuito compensado por decisao da chefia.",
      solicitacao: {
        id: "solicitacao-1",
        servidorId: "servidor-1",
        usuarioSolicitanteId: "usuario-servidor",
        tipo: "COMPENSACAO",
        dataReferencia: null,
        dataInicio: new Date("2026-06-15T08:00:00-04:00"),
        dataFim: new Date("2026-06-15T10:00:00-04:00"),
        dadosSolicitados: {
          tipoCompensacao: "COMPENSAR_DEBITO",
          minutosSolicitados: 120,
        },
      },
    });

    expect(resultado.efeitosAplicados).toBe(true);
    expect(resultado.mensagem).toMatch(/Compensa[cç][aã]o/);
    expect(autorizacaoBancoHoras.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          solicitacaoId: "solicitacao-1",
        },
        create: expect.objectContaining({
          tipo: "COMPENSACAO_DEBITO",
          status: "AUTORIZADA",
          minutosAutorizados: 120,
          justificativa: "Caso fortuito compensado por decisao da chefia.",
        }),
        update: expect.objectContaining({
          tipo: "COMPENSACAO_DEBITO",
          status: "AUTORIZADA",
          minutosAutorizados: 120,
          justificativa: "Caso fortuito compensado por decisao da chefia.",
        }),
      }),
    );
    expect(auditoriaEvento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acao: "AUTORIZACAO_PREVIA_CONCEDIDA",
        }),
      }),
    );
  });
});
