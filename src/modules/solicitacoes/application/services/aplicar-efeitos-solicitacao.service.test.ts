import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service",
  () => ({
    classificarDiaInstitucional: vi.fn(),
  }),
);

import { aplicarEfeitosSolicitacaoDeferida } from "./aplicar-efeitos-solicitacao.service";
import { classificarDiaInstitucional } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";

describe("aplicarEfeitosSolicitacaoDeferida", () => {
  it("encaminha a dispensa de ponto deferida para o recalculo do espelho", async () => {
    const resultado = await aplicarEfeitosSolicitacaoDeferida({
      tx: {} as never,
      usuarioAnaliseId: "usuario-chefia",
      justificativaAnalise: "Dispensa autorizada pela chefia.",
      solicitacao: {
        id: "solicitacao-dispensa",
        servidorId: "servidor-1",
        usuarioSolicitanteId: "usuario-servidor",
        tipo: "DISPENSA_PONTO",
        dataReferencia: new Date("2026-09-30T00:00:00Z"),
        dataInicio: null,
        dataFim: null,
        dadosSolicitados: null,
      },
    });

    expect(resultado).toEqual({
      efeitosAplicados: true,
      mensagem:
        "Dispensa de ponto deferida. O periodo sera aplicado e o espelho de ponto recalculado.",
      dadosResultado: { datasImpactadas: ["2026-09-30"] },
    });
  });

  it("cancela logicamente e audita a marcação cuja exclusão foi deferida", async () => {
    const marcacao = {
      findFirst: vi.fn().mockResolvedValue({
        id: "marcacao-1",
        servidorId: "servidor-1",
        status: "VALIDA",
        tipo: "ENTRADA",
        dataHora: new Date("2026-09-10T12:00:00Z"),
        metadados: null,
      }),
      update: vi
        .fn()
        .mockResolvedValue({ id: "marcacao-1", status: "CANCELADA" }),
    };
    const auditoriaEvento = {
      create: vi.fn().mockResolvedValue({ id: "auditoria-1" }),
    };

    const resultado = await aplicarEfeitosSolicitacaoDeferida({
      tx: { marcacao, auditoriaEvento } as never,
      usuarioAnaliseId: "usuario-chefia",
      justificativaAnalise: "Registro realizado em duplicidade.",
      solicitacao: {
        id: "solicitacao-1",
        servidorId: "servidor-1",
        usuarioSolicitanteId: "usuario-servidor",
        tipo: "EXCLUSAO_MARCACAO",
        dataReferencia: new Date("2026-09-10T00:00:00Z"),
        dataInicio: null,
        dataFim: null,
        dadosSolicitados: { marcacaoId: "marcacao-1" },
      },
    });

    expect(resultado.efeitosAplicados).toBe(true);
    expect(marcacao.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "marcacao-1" },
        data: expect.objectContaining({ status: "CANCELADA" }),
      }),
    );
    expect(auditoriaEvento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acao: "MARCACAO_CANCELADA_POR_SOLICITACAO",
        }),
      }),
    );
  });

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

  it("autoriza a conversao usando os minutos efetivamente apurados no dia especial", async () => {
    vi.mocked(classificarDiaInstitucional).mockResolvedValue({
      dataReferencia: new Date("2026-10-12T00:00:00Z"),
      tipo: "FERIADO",
      descricao: "Feriado",
      fonte: "CALENDARIO_INSTITUCIONAL",
      contaComoDiaUtil: false,
      geraApuracaoRegular: false,
    });
    const apuracaoDiaria = {
      findUnique: vi.fn().mockResolvedValue({ minutosTrabalhados: 425 }),
    };
    const autorizacaoBancoHoras = {
      upsert: vi.fn().mockResolvedValue({
        id: "autorizacao-especial",
        tipo: "CREDITO",
        status: "AUTORIZADA",
        dataInicio: new Date("2026-10-12T00:00:00Z"),
        dataFim: new Date("2026-10-12T00:00:00Z"),
        minutosAutorizados: 425,
        autorizadoPorUsuarioId: "usuario-chefia",
        autorizadoEm: new Date("2026-10-13T12:00:00Z"),
      }),
    };
    const auditoriaEvento = {
      create: vi.fn().mockResolvedValue({ id: "auditoria-especial" }),
    };

    const resultado = await aplicarEfeitosSolicitacaoDeferida({
      tx: {
        apuracaoDiaria,
        autorizacaoBancoHoras,
        auditoriaEvento,
      } as never,
      usuarioAnaliseId: "usuario-chefia",
      justificativaAnalise: "Trabalho realizado durante o feriado.",
      solicitacao: {
        id: "solicitacao-especial",
        servidorId: "servidor-1",
        usuarioSolicitanteId: "usuario-servidor",
        tipo: "CONVERSAO_DIA_ESPECIAL_BANCO_HORAS",
        dataReferencia: new Date("2026-10-12T00:00:00Z"),
        dataInicio: new Date("2026-10-12T00:00:00Z"),
        dataFim: new Date("2026-10-12T00:00:00Z"),
        dadosSolicitados: {},
      },
    });

    expect(resultado.efeitosAplicados).toBe(true);
    expect(autorizacaoBancoHoras.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tipo: "CREDITO",
          minutosAutorizados: 425,
        }),
      }),
    );
  });

  it("autoriza parcialmente a conversao do excedente de um dia comum", async () => {
    const apuracaoDiaria = {
      findUnique: vi.fn().mockResolvedValue({ minutosCredito: 146 }),
    };
    const autorizacaoBancoHoras = {
      upsert: vi.fn().mockResolvedValue({
        id: "autorizacao-excedente",
        tipo: "CREDITO",
        status: "AUTORIZADA",
        dataInicio: new Date("2026-09-03T00:00:00Z"),
        dataFim: new Date("2026-09-03T00:00:00Z"),
        minutosAutorizados: 120,
        autorizadoPorUsuarioId: "usuario-chefia",
        autorizadoEm: new Date("2026-09-04T12:00:00Z"),
      }),
    };
    const auditoriaEvento = {
      create: vi.fn().mockResolvedValue({ id: "auditoria-excedente" }),
    };

    const resultado = await aplicarEfeitosSolicitacaoDeferida({
      tx: { apuracaoDiaria, autorizacaoBancoHoras, auditoriaEvento } as never,
      usuarioAnaliseId: "usuario-chefia",
      justificativaAnalise: "Conversao de parte do excedente.",
      solicitacao: {
        id: "solicitacao-excedente",
        servidorId: "servidor-1",
        usuarioSolicitanteId: "usuario-servidor",
        tipo: "CONVERSAO_EXCEDENTE_BANCO_HORAS",
        dataReferencia: new Date("2026-09-03T00:00:00Z"),
        dataInicio: new Date("2026-09-03T00:00:00Z"),
        dataFim: new Date("2026-09-03T00:00:00Z"),
        dadosSolicitados: { minutosSolicitados: 120 },
      },
    });

    expect(resultado.efeitosAplicados).toBe(true);
    expect(autorizacaoBancoHoras.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tipo: "CREDITO",
          minutosAutorizados: 120,
        }),
      }),
    );
  });

  it("recusa conversao acima do excedente apurado", async () => {
    const apuracaoDiaria = {
      findUnique: vi.fn().mockResolvedValue({ minutosCredito: 146 }),
    };
    const autorizacaoBancoHoras = { upsert: vi.fn() };

    const resultado = await aplicarEfeitosSolicitacaoDeferida({
      tx: { apuracaoDiaria, autorizacaoBancoHoras } as never,
      usuarioAnaliseId: "usuario-chefia",
      justificativaAnalise: "Valor superior ao disponivel.",
      solicitacao: {
        id: "solicitacao-excedente",
        servidorId: "servidor-1",
        usuarioSolicitanteId: "usuario-servidor",
        tipo: "CONVERSAO_EXCEDENTE_BANCO_HORAS",
        dataReferencia: new Date("2026-09-03T00:00:00Z"),
        dataInicio: new Date("2026-09-03T00:00:00Z"),
        dataFim: new Date("2026-09-03T00:00:00Z"),
        dadosSolicitados: { minutosSolicitados: 180 },
      },
    });

    expect(resultado.efeitosAplicados).toBe(false);
    expect(autorizacaoBancoHoras.upsert).not.toHaveBeenCalled();
  });
});
