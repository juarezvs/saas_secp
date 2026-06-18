import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../infrastructure/repositories/homologacao.repository", () => ({
  listarApuracoesServidorMes: vi.fn(),
  listarJornadasServidorMes: vi.fn(),
  listarMovimentosPendentesBancoHorasMes: vi.fn(),
  listarSolicitacoesPendentesServidorMes: vi.fn(),
}));

vi.mock(
  "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/modules/calendario-institucional/application/services/classificar-dia-institucional.service")
      >();

    return {
      ...original,
      carregarCalendarioInstitucionalPeriodo: vi.fn().mockResolvedValue({
        eventosPorData: new Map(),
        recessos: [],
      }),
    };
  },
);

import {
  listarApuracoesServidorMes,
  listarJornadasServidorMes,
  listarMovimentosPendentesBancoHorasMes,
  listarSolicitacoesPendentesServidorMes,
} from "../../infrastructure/repositories/homologacao.repository";
import { validarPendenciasHomologacaoServidor } from "./validar-pendencias-homologacao.service";

function apuracao(data: string, cargaPrevistaMinutos = 420) {
  return {
    id: `apuracao-${data}`,
    servidorId: "servidor-1",
    jornadaServidorId: "jornada-7h",
    dataReferencia: new Date(`${data}T00:00:00.000Z`),
    cargaPrevistaMinutos,
    minutosTrabalhados: cargaPrevistaMinutos,
    minutosIntervalo: 0,
    minutosCredito: 0,
    minutosDebito: 0,
    resultado: "REGULAR" as const,
    status: "CALCULADA" as const,
    primeiraEntrada: null,
    saidaIntervalo: null,
    retornoIntervalo: null,
    ultimaSaida: null,
    observacao: null,
    metadados: null,
    calculadaEm: new Date("2026-06-01T12:00:00.000Z"),
    criadoEm: new Date("2026-06-01T12:00:00.000Z"),
    atualizadoEm: new Date("2026-06-01T12:00:00.000Z"),
    ocorrencias: [],
  };
}

describe("validarPendenciasHomologacaoServidor", () => {
  beforeEach(() => {
    vi.mocked(listarApuracoesServidorMes).mockReset();
    vi.mocked(listarJornadasServidorMes).mockReset();
    vi.mocked(listarMovimentosPendentesBancoHorasMes).mockReset();
    vi.mocked(listarSolicitacoesPendentesServidorMes).mockReset();
    vi.mocked(listarMovimentosPendentesBancoHorasMes).mockResolvedValue([]);
    vi.mocked(listarSolicitacoesPendentesServidorMes).mockResolvedValue([]);
    vi.mocked(listarJornadasServidorMes).mockResolvedValue([
      {
        id: "jornada-7h",
        servidorId: "servidor-1",
        jornadaId: "jornada-base-7h",
        escalaId: null,
        dataInicio: new Date("2026-01-01T00:00:00.000Z"),
        dataFim: null,
        ativo: true,
        justificativa: null,
        horarioDiferenciadoAutorizado: false,
        autorizadoPorUsuarioId: null,
        autorizadoEm: null,
        criadoEm: new Date("2026-01-01T00:00:00.000Z"),
        atualizadoEm: new Date("2026-01-01T00:00:00.000Z"),
        jornada: {
          cargaDiariaMinutos: 420,
        },
      },
    ]);
  });

  it("usa dias uteis do mes vezes jornada como carga prevista mensal", async () => {
    vi.mocked(listarApuracoesServidorMes).mockResolvedValue(
      Array.from({ length: 22 }, (_, index) =>
        apuracao(`2026-06-${String(index + 1).padStart(2, "0")}`),
      ),
    );

    const resultado = await validarPendenciasHomologacaoServidor({
      servidorId: "servidor-1",
      anoReferencia: 2026,
      mesReferencia: 6,
    });

    expect(resultado.totais.cargaPrevistaMinutos).toBe(22 * 420);
  });

  it("aponta pendencia quando falta apuracao de dia util esperado", async () => {
    vi.mocked(listarApuracoesServidorMes).mockResolvedValue([
      apuracao("2026-06-01"),
    ]);

    const resultado = await validarPendenciasHomologacaoServidor({
      servidorId: "servidor-1",
      anoReferencia: 2026,
      mesReferencia: 6,
    });

    expect(resultado.pendencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: "APURACAO_MENSAL_INCOMPLETA",
          quantidade: 21,
          minutos: 21 * 420,
        }),
      ]),
    );
    expect(resultado.totais.cargaPrevistaMinutos).toBe(22 * 420);
  });
});
