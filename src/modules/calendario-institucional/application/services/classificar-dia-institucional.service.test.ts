import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../../infrastructure/repositories/calendario-institucional.repository",
  () => ({
    buscarEventoCalendarioInstitucionalPorData: vi.fn(),
    listarEventosCalendarioInstitucionalNoPeriodo: vi.fn(),
  }),
);

vi.mock(
  "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository",
  () => ({
    listarRecessosForensesNoPeriodo: vi.fn(),
  }),
);

import {
  buscarEventoCalendarioInstitucionalPorData,
  listarEventosCalendarioInstitucionalNoPeriodo,
} from "../../infrastructure/repositories/calendario-institucional.repository";
import { listarRecessosForensesNoPeriodo } from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";

import {
  carregarCalendarioInstitucionalPeriodo,
  classificarDiaInstitucional,
  type CalendarioInstitucionalPrecarregado,
} from "./classificar-dia-institucional.service";

function eventoCalendario(params: {
  id?: string;
  dataReferencia: Date;
  ativo?: boolean;
  tipo?: "FERIADO" | "PONTO_FACULTATIVO" | "SUSPENSAO_EXPEDIENTE";
  contaComoDiaUtil?: boolean;
  geraApuracaoRegular?: boolean;
}) {
  return {
    id: params.id ?? "evento-1",
    dataReferencia: params.dataReferencia,
    descricao: "Evento institucional",
    tipo: params.tipo ?? "FERIADO",
    contaComoDiaUtil: params.contaComoDiaUtil ?? false,
    geraApuracaoRegular: params.geraApuracaoRegular ?? false,
    observacao: null,
    ativo: params.ativo ?? true,
    criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    atualizadoEm: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("classificarDiaInstitucional", () => {
  beforeEach(() => {
    vi.mocked(buscarEventoCalendarioInstitucionalPorData).mockReset();
    vi.mocked(listarEventosCalendarioInstitucionalNoPeriodo).mockReset();
    vi.mocked(listarRecessosForensesNoPeriodo).mockReset();
    vi.mocked(listarRecessosForensesNoPeriodo).mockResolvedValue([]);
  });

  it("classifica evento ativo do calendario institucional", async () => {
    vi.mocked(buscarEventoCalendarioInstitucionalPorData).mockResolvedValue(
      eventoCalendario({
        dataReferencia: new Date("2026-06-08T00:00:00.000Z"),
        tipo: "PONTO_FACULTATIVO",
        contaComoDiaUtil: false,
        geraApuracaoRegular: false,
      }),
    );

    const classificacao = await classificarDiaInstitucional(
      new Date("2026-06-08T12:00:00.000Z"),
    );

    expect(classificacao).toMatchObject({
      tipo: "PONTO_FACULTATIVO",
      fonte: "CALENDARIO_INSTITUCIONAL",
      contaComoDiaUtil: false,
      geraApuracaoRegular: false,
      eventoCalendarioId: "evento-1",
    });
  });

  it("ignora evento inativo ao classificar uma data isolada", async () => {
    vi.mocked(buscarEventoCalendarioInstitucionalPorData).mockResolvedValue(
      eventoCalendario({
        dataReferencia: new Date("2026-06-08T00:00:00.000Z"),
        ativo: false,
      }),
    );

    const classificacao = await classificarDiaInstitucional(
      new Date("2026-06-08T12:00:00.000Z"),
    );

    expect(classificacao).toMatchObject({
      tipo: "UTIL",
      fonte: "PADRAO",
      contaComoDiaUtil: true,
      geraApuracaoRegular: true,
    });
  });

  it("ignora evento inativo recebido em calendario precarregado", async () => {
    const dataReferencia = new Date("2026-06-08T00:00:00.000Z");
    const calendario: CalendarioInstitucionalPrecarregado = {
      eventosPorData: new Map([
        [
          "2026-06-08",
          eventoCalendario({
            dataReferencia,
            ativo: false,
          }),
        ],
      ]),
      recessos: [],
    };

    const classificacao = await classificarDiaInstitucional(
      dataReferencia,
      calendario,
    );

    expect(classificacao.tipo).toBe("UTIL");
    expect(classificacao.fonte).toBe("PADRAO");
  });

  it("precarrega apenas eventos retornados pelo repositorio do periodo", async () => {
    const eventoAtivo = eventoCalendario({
      dataReferencia: new Date("2026-06-08T00:00:00.000Z"),
    });
    vi.mocked(listarEventosCalendarioInstitucionalNoPeriodo).mockResolvedValue([
      eventoAtivo,
    ]);

    const calendario = await carregarCalendarioInstitucionalPeriodo({
      inicio: new Date("2026-06-01T00:00:00.000Z"),
      fimExclusivo: new Date("2026-07-01T00:00:00.000Z"),
    });

    expect(calendario.eventosPorData.get("2026-06-08")).toBe(eventoAtivo);
    expect(listarEventosCalendarioInstitucionalNoPeriodo).toHaveBeenCalledWith(
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-07-01T00:00:00.000Z"),
    );
  });
});
