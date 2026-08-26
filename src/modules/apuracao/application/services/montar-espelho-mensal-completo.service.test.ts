import { describe, expect, it } from "vitest";

import type { CalendarioInstitucionalPrecarregado } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";

import { montarEspelhoMensalCompleto } from "./montar-espelho-mensal-completo.service";

function calendarioComFeriado(
  data: string,
): CalendarioInstitucionalPrecarregado {
  return {
    eventosPorData: new Map([
      [
        data,
        {
          id: "evento-feriado",
          dataReferencia: new Date(`${data}T00:00:00.000Z`),
          descricao: "Feriado institucional",
          tipo: "FERIADO",
          contaComoDiaUtil: false,
          geraApuracaoRegular: false,
          janelaInicio: null,
          janelaFim: null,
          dataOriginal: null,
          dataSubstituida: false,
          observacao: null,
          ativo: true,
          criadoEm: new Date("2026-01-01T00:00:00.000Z"),
          atualizadoEm: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    ]),
    recessos: [],
  };
}

const jornada = {
  id: "jornada-servidor",
  dataInicio: new Date("2026-01-01T00:00:00.000Z"),
  dataFim: null,
  jornada: {
    cargaDiariaMinutos: 420,
  },
};

const jornadaTeletrabalho = {
  id: "jornada-servidor-teletrabalho",
  dataInicio: new Date("2026-06-01T00:00:00.000Z"),
  dataFim: null,
  jornada: {
    tipo: "TELETRABALHO",
    cargaDiariaMinutos: 420,
    horarioEntradaPadrao: "08:00",
    horarioSaidaPadrao: "15:00",
    cruzaMeiaNoite: false,
    controlaHorario: true,
    dias: [],
  },
};

const jornadaHibridaHomeOffice = {
  id: "jornada-servidor-hibrida",
  dataInicio: new Date("2026-06-01T00:00:00.000Z"),
  dataFim: null,
  jornada: {
    tipo: "HIBRIDO",
    cargaDiariaMinutos: 420,
    horarioEntradaPadrao: "08:00",
    horarioSaidaPadrao: "15:00",
    cruzaMeiaNoite: false,
    controlaHorario: true,
    dias: [
      {
        diaSemana: "SEGUNDA",
        ordemNoCiclo: null,
        tipoDia: "HOME_OFFICE",
        cargaPrevistaMinutos: 0,
        faixas: [],
      },
    ],
  },
};

describe("montarEspelhoMensalCompleto", () => {
  it("monta todos os dias do mes e calcula previsto mensal considerando feriados", async () => {
    const espelho = await montarEspelhoMensalCompleto({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: calendarioComFeriado("2026-06-08"),
      jornadas: [jornada],
      apuracoes: [],
      hoje: new Date("2026-06-18T00:00:00.000Z"),
    });

    expect(espelho.itens).toHaveLength(30);
    expect(espelho.cargaPrevistaMensalMinutos).toBe(21 * 420);

    const feriado = espelho.itens.find(
      (item) => item.dataReferencia.toISOString().slice(0, 10) === "2026-06-08",
    );
    const diaUtilFuturo = espelho.itens.find(
      (item) => item.dataReferencia.toISOString().slice(0, 10) === "2026-06-19",
    );

    expect(feriado).toEqual(
      expect.objectContaining({
        cargaPrevistaMinutos: 0,
        resultado: "SEM_EXPEDIENTE",
      }),
    );
    expect(diaUtilFuturo).toEqual(
      expect.objectContaining({
        cargaPrevistaMinutos: 420,
        contabilizarSaldos: false,
      }),
    );
  });

  it("abate compensacao deferida do debito liquido exibido no espelho", async () => {
    const espelho = await montarEspelhoMensalCompleto({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: { eventosPorData: new Map(), recessos: [] },
      jornadas: [jornada],
      hoje: new Date("2026-06-18T00:00:00.000Z"),
      apuracoes: [
        {
          id: "apuracao",
          dataReferencia: new Date("2026-06-17T00:00:00.000Z"),
          cargaPrevistaMinutos: 420,
          minutosTrabalhados: 380,
          minutosIntervalo: 0,
          minutosCredito: 0,
          minutosDebito: 40,
          resultado: "DEBITO",
          status: "INCONSISTENTE",
          metadados: {},
          ocorrencias: [
            {
              tipo: "DEBITO",
              descricao: "Ausencia parcial.",
              minutos: 40,
            },
          ],
          movimentoBancoHoras: [
            {
              tipo: "COMPENSACAO_CREDITO",
              status: "PENDENTE",
              minutos: 40,
              autorizacaoBancoHoras: {
                solicitacao: {
                  id: "solicitacao",
                  tipo: "COMPENSACAO",
                  titulo: "Compensar debito",
                },
              },
            },
          ],
        },
      ],
    });

    const item = espelho.itens.find(
      (apuracao) =>
        apuracao.dataReferencia.toISOString().slice(0, 10) === "2026-06-17",
    );

    expect(item).toEqual(
      expect.objectContaining({
        minutosDebito: 0,
        minutosDebitoApurado: 40,
        minutosDebitoCompensado: 40,
        resultado: "REGULAR",
        status: "CALCULADA",
      }),
    );
    expect(item?.metadados).toEqual(
      expect.objectContaining({
        compensacaoBancoHoras: expect.objectContaining({
          minutosDebitoLiquido: 0,
        }),
      }),
    );
  });

  it("considera teletrabalho sem marcacao como carga prevista cumprida", async () => {
    const espelho = await montarEspelhoMensalCompleto({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: { eventosPorData: new Map(), recessos: [] },
      jornadas: [jornadaTeletrabalho],
      apuracoes: [],
      hoje: new Date("2026-06-18T00:00:00.000Z"),
    });

    const segunda = espelho.itens.find(
      (item) => item.dataReferencia.toISOString().slice(0, 10) === "2026-06-01",
    );

    expect(segunda).toEqual(
      expect.objectContaining({
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 420,
        minutosDebito: 0,
        resultado: "REGULAR",
        status: "CALCULADA",
      }),
    );
    expect(segunda?.metadados).toEqual(
      expect.objectContaining({
        previsaoJornadaDia: expect.objectContaining({
          tipoDia: "TELETRABALHO",
        }),
        trabalhoRemoto: expect.objectContaining({
          ativo: true,
          regime: "TOTAL",
        }),
      }),
    );
  });

  it("considera home office sem marcacao como 7 horas previstas e cumpridas", async () => {
    const espelho = await montarEspelhoMensalCompleto({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: { eventosPorData: new Map(), recessos: [] },
      jornadas: [jornadaHibridaHomeOffice],
      apuracoes: [],
      hoje: new Date("2026-06-18T00:00:00.000Z"),
    });

    const segunda = espelho.itens.find(
      (item) => item.dataReferencia.toISOString().slice(0, 10) === "2026-06-01",
    );

    expect(segunda).toEqual(
      expect.objectContaining({
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 420,
        minutosDebito: 0,
        resultado: "REGULAR",
        status: "CALCULADA",
      }),
    );
    expect(segunda?.metadados).toEqual(
      expect.objectContaining({
        previsaoJornadaDia: expect.objectContaining({
          tipoDia: "HOME_OFFICE",
        }),
        trabalhoRemoto: expect.objectContaining({
          ativo: true,
          regime: "TOTAL",
          diaSemana: "HOME_OFFICE",
        }),
      }),
    );
  });
});
