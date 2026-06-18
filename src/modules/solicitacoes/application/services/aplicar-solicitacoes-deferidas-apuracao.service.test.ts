import { describe, expect, it } from "vitest";

import { aplicarSolicitacoesDeferidasApuracao } from "./aplicar-solicitacoes-deferidas-apuracao.service";

const jornada = {
  cargaDiariaMinutos: 7 * 60,
};

const calculoBase = {
  cargaPrevistaMinutos: 7 * 60,
  minutosTrabalhados: 0,
  minutosIntervalo: 0,
  minutosCredito: 0,
  minutosDebito: 7 * 60,
  resultado: "FALTA" as const,
  status: "INCONSISTENTE" as const,
  primeiraEntrada: null,
  saidaIntervalo: null,
  retornoIntervalo: null,
  ultimaSaida: null,
  janelaExpediente: {
    inicio: "08:00",
    fim: "18:00",
    diferenciada: false,
  },
  minutosForaExpediente: 0,
  dispensaPontoEletronico: null,
  trabalhoRemoto: null,
  frequenciaManual: null,
  ocorrencias: [
    {
      tipo: "FALTA" as const,
      descricao: "Nenhuma marcacao registrada no dia.",
      minutos: 7 * 60,
    },
  ],
};

const calculoComCredito = {
  ...calculoBase,
  minutosTrabalhados: 8 * 60,
  minutosCredito: 60,
  minutosDebito: 0,
  resultado: "CREDITO" as const,
  status: "CALCULADA" as const,
  ocorrencias: [
    {
      tipo: "CREDITO" as const,
      descricao: "Tempo trabalhado superior a carga diaria prevista.",
      minutos: 60,
    },
  ],
};

const calculoDispensadoSemFrequenciaManual = {
  ...calculoBase,
  minutosTrabalhados: 7 * 60,
  minutosDebito: 0,
  resultado: "REGULAR" as const,
  dispensaPontoEletronico: {
    ativa: true,
    motivos: ["Servidor ocupante de cargo de oficial de justica."],
    exigeFrequenciaManual: true,
  },
  frequenciaManual: {
    obrigatoria: true,
    registrada: false,
    descricao:
      "Frequencia manual obrigatoria para servidor dispensado do ponto eletronico.",
  },
  ocorrencias: [
    {
      tipo: "MARCACAO_INCOMPLETA" as const,
      descricao:
        "Frequencia manual obrigatoria nao registrada para servidor dispensado do ponto eletronico.",
      minutos: 0,
    },
  ],
};

describe("aplicarSolicitacoesDeferidasApuracao", () => {
  it("abona integralmente o dia quando ha justificativa deferida", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      solicitacoes: [
        {
          id: "sol-1",
          tipo: "ABONO_JUSTIFICATIVA",
          titulo: "Abono",
          descricao: "Caso fortuito",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T08:00:00-04:00"),
          dataFim: new Date("2026-06-15T18:00:00-04:00"),
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("REGULAR");
    expect(resultado.calculo.status).toBe("CALCULADA");
    expect(resultado.calculo.minutosTrabalhados).toBe(420);
    expect(resultado.calculo.minutosDebito).toBe(0);
    expect(resultado.calculo.ocorrencias).toEqual([]);
  });

  it("usa capacitacao externa acima de quatro horas para fechar a jornada do dia", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      solicitacoes: [
        {
          id: "sol-2",
          tipo: "CAPACITACAO",
          titulo: "Curso externo",
          descricao: "Capacitacao institucional",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T08:00:00-04:00"),
          dataFim: new Date("2026-06-15T12:30:00-04:00"),
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("REGULAR");
    expect(resultado.calculo.minutosTrabalhados).toBe(420);
    expect(resultado.calculo.minutosCredito).toBe(0);
    expect(resultado.calculo.minutosDebito).toBe(0);
  });

  it("exige complementacao quando capacitacao externa tem menos de quatro horas", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      solicitacoes: [
        {
          id: "sol-capacitacao-parcial",
          tipo: "CAPACITACAO",
          titulo: "Curso externo parcial",
          descricao: "Capacitacao institucional inferior a quatro horas",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T08:00:00-04:00"),
          dataFim: new Date("2026-06-15T11:00:00-04:00"),
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("DEBITO");
    expect(resultado.calculo.status).toBe("INCONSISTENTE");
    expect(resultado.calculo.minutosTrabalhados).toBe(180);
    expect(resultado.calculo.minutosCredito).toBe(0);
    expect(resultado.calculo.minutosDebito).toBe(240);
    expect(resultado.calculo.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: "DEBITO",
          descricao: expect.stringContaining("complementacao"),
          minutos: 240,
        }),
      ]),
    );
  });

  it("nao abona capacitacao interna sem registro biometrico", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      marcacoes: [{ fonte: "MANUAL_ADMINISTRATIVO" }],
      solicitacoes: [
        {
          id: "sol-capacitacao-interna-sem-biometria",
          tipo: "CAPACITACAO",
          titulo: "Curso interno",
          descricao: "Capacitacao interna institucional",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T08:00:00-04:00"),
          dataFim: new Date("2026-06-15T12:30:00-04:00"),
          dadosSolicitados: {
            modalidadeCapacitacao: "INTERNA",
          },
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("FALTA");
    expect(resultado.calculo.status).toBe("INCONSISTENTE");
    expect(resultado.calculo.minutosTrabalhados).toBe(0);
    expect(resultado.calculo.minutosDebito).toBe(420);
    expect(resultado.solicitacoesAplicadas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sol-capacitacao-interna-sem-biometria",
          minutosCobertos: 0,
          coberturaIntegral: false,
        }),
      ]),
    );
    expect(resultado.calculo.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: "FALTA",
          descricao: expect.stringContaining("registro biometrico"),
          minutos: 420,
        }),
      ]),
    );
  });

  it("abona capacitacao interna quando as marcacoes sao biometricas", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      marcacoes: [{ fonte: "EQUIPAMENTO_BIOMETRICO" }],
      solicitacoes: [
        {
          id: "sol-capacitacao-interna-biometrica",
          tipo: "CAPACITACAO",
          titulo: "Curso interno",
          descricao: "Capacitacao interna institucional",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T08:00:00-04:00"),
          dataFim: new Date("2026-06-15T12:30:00-04:00"),
          dadosSolicitados: {
            modalidadeCapacitacao: "INTERNA",
          },
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("REGULAR");
    expect(resultado.calculo.status).toBe("CALCULADA");
    expect(resultado.calculo.minutosTrabalhados).toBe(420);
    expect(resultado.calculo.minutosDebito).toBe(0);
  });

  it("reduz o debito em atividade externa parcial", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      solicitacoes: [
        {
          id: "sol-3",
          tipo: "ATIVIDADE_EXTERNA",
          titulo: "Diligencia externa",
          descricao: "Atividade em campo",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T09:00:00-04:00"),
          dataFim: new Date("2026-06-15T12:00:00-04:00"),
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("DEBITO");
    expect(resultado.calculo.status).toBe("INCONSISTENTE");
    expect(resultado.calculo.minutosTrabalhados).toBe(180);
    expect(resultado.calculo.minutosDebito).toBe(240);
    expect(resultado.calculo.minutosCredito).toBe(0);
    expect(resultado.calculo.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: "DEBITO",
          descricao: expect.stringContaining("sem autorizacao da chefia"),
        }),
      ]),
    );
  });

  it("fecha teletrabalho integral como dia regular sem exigir marcacao", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      solicitacoes: [
        {
          id: "sol-remoto-total",
          tipo: "DISPENSA_PONTO",
          titulo: "Teletrabalho integral",
          descricao: "Regime autorizado de teletrabalho",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T00:00:00-04:00"),
          dataFim: new Date("2026-06-16T00:00:00-04:00"),
          dadosSolicitados: {
            regimeTrabalhoRemoto: {
              tipo: "TOTAL",
            },
          },
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("REGULAR");
    expect(resultado.calculo.status).toBe("CALCULADA");
    expect(resultado.calculo.minutosTrabalhados).toBe(420);
    expect(resultado.calculo.minutosDebito).toBe(0);
    expect(resultado.calculo.trabalhoRemoto).toEqual(
      expect.objectContaining({
        ativo: true,
        regime: "TOTAL",
        exigeRegistroPonto: false,
      }),
    );
  });

  it("registra frequencia manual de servidor dispensado do ponto eletronico", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoDispensadoSemFrequenciaManual,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      solicitacoes: [
        {
          id: "sol-frequencia-manual",
          tipo: "DISPENSA_PONTO",
          titulo: "Frequencia manual",
          descricao: "Registro manual da frequencia",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T00:00:00-04:00"),
          dataFim: new Date("2026-06-16T00:00:00-04:00"),
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("REGULAR");
    expect(resultado.calculo.status).toBe("CALCULADA");
    expect(resultado.calculo.minutosTrabalhados).toBe(420);
    expect(resultado.calculo.minutosDebito).toBe(0);
    expect(resultado.calculo.frequenciaManual).toEqual(
      expect.objectContaining({
        obrigatoria: true,
        registrada: true,
      }),
    );
    expect(resultado.calculo.ocorrencias).toEqual([]);
  });

  it("mantem pendencia de frequencia manual quando a solicitacao deferida nao e registro manual", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoDispensadoSemFrequenciaManual,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      solicitacoes: [
        {
          id: "sol-abono",
          tipo: "ABONO_JUSTIFICATIVA",
          titulo: "Abono",
          descricao: "Justificativa que nao substitui a frequencia manual",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T00:00:00-04:00"),
          dataFim: new Date("2026-06-16T00:00:00-04:00"),
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("REGULAR");
    expect(resultado.calculo.status).toBe("INCONSISTENTE");
    expect(resultado.calculo.frequenciaManual).toEqual(
      expect.objectContaining({
        obrigatoria: true,
        registrada: false,
      }),
    );
    expect(resultado.calculo.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: "MARCACAO_INCOMPLETA",
          descricao: expect.stringContaining("Frequencia manual obrigatoria"),
        }),
      ]),
    );
  });

  it("no hibrido aplica trabalho remoto apenas nos dias configurados", () => {
    const solicitacaoHibrida = {
      id: "sol-remoto-hibrido",
      tipo: "DISPENSA_PONTO" as const,
      titulo: "Regime hibrido",
      descricao: "Teletrabalho nas segundas",
      dataReferencia: null,
      dataInicio: new Date("2026-06-15T00:00:00-04:00"),
      dataFim: new Date("2026-06-17T00:00:00-04:00"),
      dadosSolicitados: {
        regimeTrabalhoRemoto: {
          tipo: "HIBRIDO",
          diasRemotos: ["SEGUNDA"],
        },
      },
    };

    const segunda = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      solicitacoes: [solicitacaoHibrida],
    });
    const terca = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: new Date("2026-06-16T00:00:00.000Z"),
      jornada,
      solicitacoes: [solicitacaoHibrida],
    });

    expect(segunda.calculo.resultado).toBe("REGULAR");
    expect(segunda.calculo.trabalhoRemoto?.regime).toBe("HIBRIDO");
    expect(terca.calculo.resultado).toBe("FALTA");
    expect(terca.calculo.trabalhoRemoto).toBeNull();
  });

  it("preserva credito extraordinario remoto quando ha autorizacao previa e registro biometrico", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoComCredito,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      marcacoes: [
        { fonte: "WEB", metadados: { biometriaValidadaNestaEtapa: true } },
        { fonte: "WEB", metadados: { biometriaValidadaNestaEtapa: true } },
      ],
      solicitacoes: [
        {
          id: "sol-remoto",
          tipo: "DISPENSA_PONTO",
          titulo: "Teletrabalho integral",
          descricao: "Regime autorizado de teletrabalho",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T00:00:00-04:00"),
          dataFim: new Date("2026-06-16T00:00:00-04:00"),
          dadosSolicitados: {
            regimeTrabalhoRemoto: {
              tipo: "TOTAL",
            },
          },
        },
        {
          id: "sol-hora",
          tipo: "HORA_CREDITO_PREVIA",
          titulo: "Servico extraordinario remoto",
          descricao: "Credito previamente autorizado",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T15:00:00-04:00"),
          dataFim: new Date("2026-06-15T16:00:00-04:00"),
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("CREDITO");
    expect(resultado.calculo.status).toBe("CALCULADA");
    expect(resultado.calculo.minutosTrabalhados).toBe(480);
    expect(resultado.calculo.minutosCredito).toBe(60);
  });

  it("desconsidera credito remoto sem registro biometrico", () => {
    const resultado = aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoComCredito,
      dataReferencia: new Date("2026-06-15T00:00:00.000Z"),
      jornada,
      marcacoes: [{ fonte: "MANUAL_ADMINISTRATIVO" }],
      solicitacoes: [
        {
          id: "sol-remoto",
          tipo: "DISPENSA_PONTO",
          titulo: "Teletrabalho integral",
          descricao: "Regime autorizado de teletrabalho",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T00:00:00-04:00"),
          dataFim: new Date("2026-06-16T00:00:00-04:00"),
          dadosSolicitados: {
            regimeTrabalhoRemoto: {
              tipo: "TOTAL",
            },
          },
        },
        {
          id: "sol-hora",
          tipo: "HORA_CREDITO_PREVIA",
          titulo: "Servico extraordinario remoto",
          descricao: "Credito previamente autorizado",
          dataReferencia: null,
          dataInicio: new Date("2026-06-15T15:00:00-04:00"),
          dataFim: new Date("2026-06-15T16:00:00-04:00"),
        },
      ],
    });

    expect(resultado.calculo.resultado).toBe("REGULAR");
    expect(resultado.calculo.status).toBe("INCONSISTENTE");
    expect(resultado.calculo.minutosTrabalhados).toBe(420);
    expect(resultado.calculo.minutosCredito).toBe(0);
    expect(resultado.calculo.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: "HORA_NAO_AUTORIZADA",
          minutos: 60,
        }),
      ]),
    );
  });
});
