import { describe, expect, it, vi } from "vitest";

const banco = vi.hoisted(() => ({ afastamentos: vi.fn() }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    $extends() { return this; },
    afastamentoSarh: { findMany: banco.afastamentos },
    servidor: { findUnique: vi.fn(async () => null) },
    lotacao: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) },
  },
}));

import type { CalendarioInstitucionalPrecarregado } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";

import {
  afastamentoDeveImpactarEspelho,
  deveAplicarAfastamentoSarhSobreDispensa,
  montarEspelhoMensalCompleto,
} from "./montar-espelho-mensal-completo.service";

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
  it.each([
    { mes: 5, dias: [31] },
    { mes: 6, dias: [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13] },
    { mes: 8, dias: Array.from({ length: 11 }, (_, indice) => 19 + indice) },
    { mes: 10, dias: [5, 6, 7, 8, 21, 22, 23] },
  ])("exibe viagens especiais na competencia $mes inclusive apos o termino", async ({ mes, dias }) => {
    banco.afastamentos.mockResolvedValue([
      ["9", "2026-05-31", "2026-06-04"],
      ["8", "2026-06-07", "2026-06-13"],
      ["10", "2026-08-19", "2026-08-22"],
      ["11", "2026-08-23", "2026-08-29"],
      ["12", "2026-10-05", "2026-10-08"],
      ["13", "2026-10-21", "2026-10-23"],
    ].map(([id, inicio, fim]) => ({
        id: `AFASTAMENTO_ESPECIAL:AM:200401:${id}`,
        categoria: "AFASTAMENTO_ESPECIAL",
        tipoCodigo: null,
        tipoDescricao: "VIAGEM A SERVICO",
        dataInicio: new Date(`${inicio}T00:00:00.000Z`),
        dataFim: new Date(`${fim}T00:00:00.000Z`),
        processo: null,
        observacao: null,
        origemTabela: "RH_FREQUENCIA_ESPECIAL",
        ativo: true,
        payloadSarh: null,
      })));
    const espelho = await montarEspelhoMensalCompleto({
      servidorId: "servidor",
      anoReferencia: 2026,
      mesReferencia: mes,
      calendario: { eventosPorData: new Map(), recessos: [] },
      jornadas: [jornada],
      hoje: new Date("2026-10-28T16:00:00.000Z"),
      apuracoes: [],
    });
    const viagens = espelho.itens.filter(item =>
      item.ocorrencias?.some(ocorrencia => ocorrencia.tipo === "AFASTAMENTO"),
    );
    expect(viagens.map(item => item.dataReferencia.toISOString().slice(0, 10))).toEqual(
      dias.map(dia => `2026-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`),
    );
    expect(viagens.every(item => item.minutosDebito === 0)).toBe(true);
  });

  const afastamentoBase = {
    id: "afastamento",
    categoria: "LICENCA",
    tipoCodigo: "1",
    tipoDescricao: "LICENCA MEDICA",
    dataInicio: new Date("2026-09-24T00:00:00.000Z"),
    dataFim: new Date("2026-09-28T00:00:00.000Z"),
    processo: null,
    observacao: null,
    origemTabela: "RH_LICENCAS",
    ativo: true,
    payloadSarh: null,
  };

  it("preserva dispensa administrativa diante de afastamento que nao seja ferias gozadas", () => {
    expect(
      deveAplicarAfastamentoSarhSobreDispensa(
        { dispensaPontoAdministrativa: { id: "dispensa-ativa" } },
        afastamentoBase,
      ),
    ).toBe(false);
  });

  it("mantem ferias gozadas com prioridade sobre a dispensa administrativa", () => {
    expect(
      deveAplicarAfastamentoSarhSobreDispensa(
        { dispensaPontoAdministrativa: { id: "dispensa-ativa" } },
        {
          ...afastamentoBase,
          categoria: "FERIAS",
          tipoDescricao: "GOZADA",
          origemTabela: "RH_FERIAS/RH_PERIODO_FERIAS",
        },
      ),
    ).toBe(true);
  });

  it("nao retira jornada prevista por ferias adiadas", () => {
    expect(
      afastamentoDeveImpactarEspelho({
        ...afastamentoBase,
        categoria: "FERIAS",
        tipoCodigo: "4",
        tipoDescricao: "ADIADA",
        origemTabela: "RH_FERIAS/RH_PERIODO_FERIAS",
      }),
    ).toBe(false);
  });

  it("retira jornada prevista somente por ferias gozadas ativas", () => {
    expect(
      afastamentoDeveImpactarEspelho({
        ...afastamentoBase,
        categoria: "FERIAS",
        tipoCodigo: "2",
        tipoDescricao: "GOZADA",
        origemTabela: "RH_FERIAS/RH_PERIODO_FERIAS",
      }),
    ).toBe(true);
  });

  it("ignora afastamentos inativos", () => {
    expect(
      afastamentoDeveImpactarEspelho({
        ...afastamentoBase,
        ativo: false,
      }),
    ).toBe(false);
  });

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

  it("mantem como pendente a parcela do excedente que nao foi autorizada", async () => {
    const espelho = await montarEspelhoMensalCompleto({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: { eventosPorData: new Map(), recessos: [] },
      jornadas: [jornada],
      hoje: new Date("2026-06-18T00:00:00.000Z"),
      apuracoes: [
        {
          id: "apuracao-credito-parcial",
          dataReferencia: new Date("2026-06-17T00:00:00.000Z"),
          cargaPrevistaMinutos: 420,
          minutosTrabalhados: 509,
          minutosIntervalo: 0,
          minutosCredito: 89,
          minutosDebito: 0,
          resultado: "CREDITO",
          status: "CALCULADA",
          metadados: {},
          ocorrencias: [],
          movimentoBancoHoras: [
            {
              tipo: "CREDITO",
              status: "PENDENTE",
              minutos: 29,
              metadados: {},
              autorizacaoBancoHoras: null,
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
        minutosCredito: 89,
        minutosHoraExtraAutorizada: 29,
        minutosHoraExtraNaoAutorizada: 60,
        minutosBancoHoras: 29,
      }),
    );
  });

  it("classifica como pendente todo excedente ainda sem movimento de banco", async () => {
    const espelho = await montarEspelhoMensalCompleto({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: { eventosPorData: new Map(), recessos: [] },
      jornadas: [jornada],
      hoje: new Date("2026-06-18T00:00:00.000Z"),
      apuracoes: [
        {
          id: "apuracao-credito-sem-movimento",
          dataReferencia: new Date("2026-06-17T00:00:00.000Z"),
          cargaPrevistaMinutos: 420,
          minutosTrabalhados: 615,
          minutosIntervalo: 45,
          minutosCredito: 195,
          minutosDebito: 0,
          resultado: "CREDITO",
          status: "CALCULADA",
          metadados: {},
          ocorrencias: [],
          movimentoBancoHoras: [],
        },
      ],
    });

    const item = espelho.itens.find(
      (apuracao) =>
        apuracao.dataReferencia.toISOString().slice(0, 10) === "2026-06-17",
    );

    expect(item).toEqual(
      expect.objectContaining({
        minutosCredito: 195,
        minutosHoraExtraAutorizada: 0,
        minutosHoraExtraNaoAutorizada: 195,
        minutosBancoHoras: 0,
      }),
    );
  });

  it("nao contabiliza debito nem inconsistencia do dia atual mesmo apos o horario previsto", async () => {
    const espelho = await montarEspelhoMensalCompleto({
      anoReferencia: 2026,
      mesReferencia: 6,
      calendario: { eventosPorData: new Map(), recessos: [] },
      jornadas: [jornada],
      hoje: new Date("2026-06-18T23:00:00.000Z"),
      apuracoes: [
        {
          id: "apuracao-hoje",
          dataReferencia: new Date("2026-06-18T00:00:00.000Z"),
          cargaPrevistaMinutos: 420,
          minutosTrabalhados: 120,
          minutosIntervalo: 0,
          minutosCredito: 0,
          minutosDebito: 300,
          resultado: "DEBITO",
          status: "INCONSISTENTE",
          primeiraEntrada: new Date("2026-06-18T12:00:00.000Z"),
          metadados: {
            janelaExpediente: {
              inicio: "08:00",
              fim: "18:00",
            },
          },
          ocorrencias: [
            {
              tipo: "DEBITO",
              descricao: "Ausencia parcial.",
              minutos: 300,
            },
          ],
        },
      ],
    });

    const hoje = espelho.itens.find(
      (apuracao) =>
        apuracao.dataReferencia.toISOString().slice(0, 10) === "2026-06-18",
    );

    expect(hoje).toEqual(
      expect.objectContaining({
        minutosCredito: 0,
        minutosDebito: 0,
        resultado: "PENDENTE",
        status: "PENDENTE",
        contabilizarSaldos: false,
        minutosDebitoApurado: 0,
        minutosBancoHoras: 0,
      }),
    );
    expect(hoje?.ocorrencias).toEqual([]);
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
