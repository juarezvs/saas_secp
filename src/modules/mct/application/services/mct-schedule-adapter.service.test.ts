import { describe, expect, it } from "vitest";
import { adaptarJornadaCarregadaParaMct } from "./mct-schedule-adapter.service";

function vinculacao(overrides: Record<string, unknown> = {}) {
  return {
    id: "v1",
    servidorId: "s1",
    jornadaId: "j1",
    escalaId: null,
    dataInicio: new Date("2026-01-01T00:00:00Z"),
    dataFim: null,
    ativo: true,
    justificativa: null,
    tipoVinculacao: "PERMANENTE",
    motivo: null,
    fundamentoDocumental: null,
    documentoSei: null,
    atoNumero: null,
    atoData: null,
    horarioDiferenciadoAutorizado: false,
    horarioDiferenciadoInicio: null,
    horarioDiferenciadoFim: null,
    status: "ATIVO",
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    jornada: {
      id: "j1",
      orgaoId: "o1",
      codigo: "J7",
      nome: "Jornada 7h",
      descricao: null,
      tipo: "SEMANAL",
      cargaDiariaMinutos: 420,
      cargaSemanalMinutos: 2100,
      cargaMensalMinutos: null,
      cargaMinimaDiariaMinutos: null,
      cargaMaximaDiariaMinutos: null,
      controlaHorario: true,
      permiteFlexibilidade: false,
      permiteCompensacaoNoDia: true,
      permiteBancoHoras: true,
      permiteHoraExtra: false,
      exigeIntervalo: false,
      intervaloMinimoMinutos: null,
      intervaloMaximoMinutos: null,
      horarioEntradaPadrao: "08:00",
      horarioSaidaPadrao: "15:00",
      horarioDiferenciadoPermitido: false,
      entradaMinimaDiferenciada: null,
      saidaMaximaDiferenciada: null,
      nucleoObrigatorioInicio: null,
      nucleoObrigatorioFim: null,
      permanenciaMaximaMinutos: null,
      horarioLimiteVirada: null,
      cruzaMeiaNoite: false,
      fundamentoNormativo: null,
      versao: 1,
      vigenciaInicio: null,
      vigenciaFim: null,
      situacao: "ATIVA",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      dias: [
        {
          id: "d1",
          jornadaId: "j1",
          diaSemana: "SEGUNDA",
          ordemNoCiclo: null,
          tipoDia: "TRABALHO",
          fechamentoCiclo: null,
          intervaloLivre: false,
          cargaPrevistaMinutos: 420,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          faixas: [
            {
              id: "f1",
              jornadaId: "j1",
              jornadaDiaId: "d1",
              tipo: "TRABALHO",
              horaInicio: "08:00",
              horaFim: "15:00",
              cruzaMeiaNoite: false,
              obrigatoria: true,
              ordem: 1,
              criadoEm: new Date(),
              atualizadoEm: new Date(),
            },
          ],
        },
      ],
    },
    escala: null,
    ...overrides,
  } as unknown as Parameters<typeof adaptarJornadaCarregadaParaMct>[0];
}

describe("MctScheduleAdapter", () => {
  it("usa a jornada semanal como fonte do plano MCT", () => {
    const resultado = adaptarJornadaCarregadaParaMct(
      vinculacao(),
      new Date("2026-10-12T00:00:00Z"),
    );
    expect(resultado.fonte).toBe("JORNADA_DIA");
    expect(resultado.plano.jornadaExigivelMinutos).toBe(420);
    expect(resultado.referencia?.inicio.toISOString()).toContain(
      "T12:00:00.000Z",
    );
    expect(resultado.fusoHorario).toBe("America/Manaus");
  });

  it("prioriza a escala cíclica e preserva a posição do ciclo", () => {
    const base = vinculacao();
    const resultado = adaptarJornadaCarregadaParaMct(
      vinculacao({
        escalaId: "e1",
        escala: {
          id: "e1",
          jornadaId: "j1",
          codigo: "12X36",
          nome: "12x36",
          descricao: null,
          tipo: "CICLICA",
          quantidadeDiasCiclo: 2,
          dataAncoragem: new Date("2026-10-12T00:00:00Z"),
          primeiroDiaTrabalho: null,
          timezone: "America/Manaus",
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          dias: [
            {
              id: "ed1",
              escalaId: "e1",
              diaSemana: null,
              posicaoCiclo: 1,
              tipoDia: "TRABALHO",
              trabalha: true,
              horarioEntrada: "07:00",
              horarioSaida: "19:00",
              intervaloInicio: null,
              intervaloFim: null,
              cargaPrevistaMinutos: 720,
              cruzaMeiaNoite: false,
              criadoEm: new Date(),
              atualizadoEm: new Date(),
            },
          ],
        },
        jornada: base.jornada,
      }),
      new Date("2026-10-12T00:00:00Z"),
    );
    expect(resultado.fonte).toBe("ESCALA");
    expect(resultado.plano.posicaoCiclo).toBe(1);
    expect(resultado.plano.jornadaExigivelMinutos).toBe(720);
  });

  it("aponta configuração incompleta sem ocultar o plano", () => {
    const base = vinculacao();
    const jornada = {
      ...base.jornada,
      horarioEntradaPadrao: null,
      horarioSaidaPadrao: null,
      dias: [],
    };
    const resultado = adaptarJornadaCarregadaParaMct(
      vinculacao({ jornada }),
      new Date("2026-10-12T00:00:00Z"),
    );
    expect(resultado.diagnosticos).toContain(
      "Jornada com controle de horário sem janela de referência.",
    );
  });
});
