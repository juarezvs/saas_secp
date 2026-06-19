import { describe, expect, it } from "vitest";

import { calcularApuracaoDiaria } from "./calcular-apuracao-diaria.service";

const jornada7h = {
  jornadaServidorId: "jornada-servidor-7h",
  cargaDiariaMinutos: 7 * 60,
  exigeIntervalo: false,
  intervaloMinimoMinutos: null,
  intervaloMaximoMinutos: null,
  horarioDiferenciadoPermitido: true,
  horarioDiferenciadoAutorizado: false,
  entradaMinimaDiferenciada: "06:00",
  saidaMaximaDiferenciada: "19:00",
};

const jornada8h = {
  jornadaServidorId: "jornada-servidor-8h",
  cargaDiariaMinutos: 8 * 60,
  exigeIntervalo: true,
  intervaloMinimoMinutos: 60,
  intervaloMaximoMinutos: 180,
  horarioDiferenciadoPermitido: true,
  horarioDiferenciadoAutorizado: false,
  entradaMinimaDiferenciada: "06:00",
  saidaMaximaDiferenciada: "19:00",
};

function data(hora: string) {
  return new Date(`2026-06-01T${hora}:00-04:00`);
}

function marcacao(tipo: string, hora: string) {
  return {
    id: `${tipo}-${hora}`,
    tipo,
    dataHora: data(hora),
  };
}

describe("calcularApuracaoDiaria", () => {
  it("calcula jornada de 7h regular sem intervalo", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [marcacao("ENTRADA", "08:00"), marcacao("SAIDA", "15:00")],
    });

    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.minutosTrabalhados).toBe(420);
    expect(resultado.minutosCredito).toBe(0);
    expect(resultado.minutosDebito).toBe(0);
  });

  it("nao gera credito antes da oitava hora efetiva na jornada de 7h", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [marcacao("ENTRADA", "08:00"), marcacao("SAIDA", "16:00")],
    });

    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.status).toBe("INCONSISTENTE");
    expect(resultado.minutosTrabalhados).toBe(480);
    expect(resultado.minutosCredito).toBe(0);
    expect(resultado.minutosDebito).toBe(0);
  });

  it("gera credito na jornada de 7h somente apos a oitava hora efetiva com intervalo minimo", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [
        marcacao("ENTRADA", "08:00"),
        marcacao("SAIDA_INTERVALO", "12:00"),
        marcacao("RETORNO_INTERVALO", "13:00"),
        marcacao("SAIDA", "18:00"),
      ],
    });

    expect(resultado.resultado).toBe("CREDITO");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.minutosTrabalhados).toBe(540);
    expect(resultado.minutosIntervalo).toBe(60);
    expect(resultado.minutosCredito).toBe(60);
    expect(resultado.minutosDebito).toBe(0);
  });

  it("sinaliza inconsistencia quando a jornada de 7h tenta gerar credito sem intervalo minimo", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [marcacao("ENTRADA", "08:00"), marcacao("SAIDA", "17:00")],
    });

    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.status).toBe("INCONSISTENTE");
    expect(resultado.minutosTrabalhados).toBe(540);
    expect(resultado.minutosCredito).toBe(0);
    expect(resultado.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: "INTERVALO_INVALIDO" }),
      ]),
    );
  });

  it("calcula debito quando a jornada de 7h fica abaixo da carga prevista", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [marcacao("ENTRADA", "08:00"), marcacao("SAIDA", "14:30")],
    });

    expect(resultado.resultado).toBe("DEBITO");
    expect(resultado.status).toBe("INCONSISTENTE");
    expect(resultado.minutosTrabalhados).toBe(390);
    expect(resultado.minutosCredito).toBe(0);
    expect(resultado.minutosDebito).toBe(30);
    expect(resultado.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: "DEBITO",
          descricao: expect.stringContaining("sem autorizacao da chefia"),
        }),
      ]),
    );
  });

  it("calcula jornada de 8h com intervalo valido", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada8h,
      marcacoes: [
        marcacao("ENTRADA", "08:00"),
        marcacao("SAIDA_INTERVALO", "12:00"),
        marcacao("RETORNO_INTERVALO", "13:00"),
        marcacao("SAIDA", "17:00"),
      ],
    });

    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.minutosIntervalo).toBe(60);
    expect(resultado.minutosTrabalhados).toBe(480);
    expect(resultado.minutosCredito).toBe(0);
    expect(resultado.minutosDebito).toBe(0);
  });

  it("nao gera credito indevido quando o intervalo da jornada de 8h e menor que 1h", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada8h,
      marcacoes: [
        marcacao("ENTRADA", "08:00"),
        marcacao("SAIDA_INTERVALO", "12:00"),
        marcacao("RETORNO_INTERVALO", "12:30"),
        marcacao("SAIDA", "17:00"),
      ],
    });

    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.status).toBe("INCONSISTENTE");
    expect(resultado.minutosIntervalo).toBe(30);
    expect(resultado.minutosTrabalhados).toBe(480);
    expect(resultado.minutosCredito).toBe(0);
    expect(resultado.minutosDebito).toBe(0);
    expect(resultado.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: "INTERVALO_INVALIDO" }),
      ]),
    );
  });

  it("marca jornada de 8h sem retorno de intervalo como incompleta", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada8h,
      marcacoes: [
        marcacao("ENTRADA", "08:00"),
        marcacao("SAIDA_INTERVALO", "12:00"),
        marcacao("SAIDA", "17:00"),
      ],
    });

    expect(resultado.resultado).toBe("INCOMPLETA");
    expect(resultado.status).toBe("INCONSISTENTE");
    expect(resultado.minutosDebito).toBe(480);
  });

  it("marca falta quando nao ha marcacoes no dia", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [],
    });

    expect(resultado.resultado).toBe("FALTA");
    expect(resultado.status).toBe("INCONSISTENTE");
    expect(resultado.minutosTrabalhados).toBe(0);
    expect(resultado.minutosDebito).toBe(420);
    expect(resultado.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: "FALTA",
          descricao: expect.stringContaining("sem autorizacao da chefia"),
        }),
      ]),
    );
  });

  it("calcula dia dispensado sem inconsistencia mesmo com frequencia manual", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [],
      dispensaPontoEletronico: {
        ativa: true,
        motivos: ["Servidor ocupante de cargo de oficial de justica."],
        exigeFrequenciaManual: true,
      },
    });

    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.minutosTrabalhados).toBe(420);
    expect(resultado.minutosDebito).toBe(0);
    expect(resultado.frequenciaManual).toEqual(
      expect.objectContaining({
        obrigatoria: true,
        registrada: false,
      }),
    );
    expect(resultado.ocorrencias).toEqual([]);
    expect(resultado.dispensaPontoEletronico).toEqual(
      expect.objectContaining({
        ativa: true,
        exigeFrequenciaManual: true,
      }),
    );
  });

  it("desconsidera marcacoes existentes quando ha dispensa de ponto na data", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [
        {
          id: "m1",
          tipo: "ENTRADA",
          dataHora: new Date("2026-06-10T08:00:00Z"),
        },
      ],
      dispensaPontoEletronico: {
        ativa: true,
        motivos: ["Dispensa administrativa de ponto."],
        exigeFrequenciaManual: false,
      },
    });

    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.minutosTrabalhados).toBe(420);
    expect(resultado.minutosCredito).toBe(0);
    expect(resultado.minutosDebito).toBe(0);
    expect(resultado.primeiraEntrada).toBeNull();
    expect(resultado.ultimaSaida).toBeNull();
    expect(resultado.ocorrencias).toEqual([]);
  });

  it("marca sem expediente em dia institucional sem apuracao regular e sem marcacoes", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [],
      diaInstitucional: {
        tipo: "FERIADO",
        contaComoDiaUtil: false,
        geraApuracaoRegular: false,
        descricao: "Feriado local",
      },
    });

    expect(resultado.resultado).toBe("SEM_EXPEDIENTE");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.cargaPrevistaMinutos).toBe(0);
    expect(resultado.minutosDebito).toBe(0);
    expect(resultado.minutosCredito).toBe(0);
  });

  it("nao gera falta ou debito em sabado sem expediente ordinario", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [],
      diaInstitucional: {
        tipo: "SABADO",
        contaComoDiaUtil: false,
        geraApuracaoRegular: false,
        descricao: "Sabado",
      },
    });

    expect(resultado.resultado).toBe("SEM_EXPEDIENTE");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.cargaPrevistaMinutos).toBe(0);
    expect(resultado.minutosDebito).toBe(0);
  });

  it("mantem expediente ordinario das 08:00 as 18:00 em dia util", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [marcacao("ENTRADA", "07:30"), marcacao("SAIDA", "18:30")],
      diaInstitucional: {
        tipo: "UTIL",
        contaComoDiaUtil: true,
        geraApuracaoRegular: true,
        descricao: "Dia util regular",
      },
    });

    expect(resultado.janelaExpediente).toEqual({
      inicio: "08:00",
      fim: "18:00",
      diferenciada: false,
    });
    expect(resultado.minutosForaExpediente).toBe(60);
  });

  it("transforma todo o tempo trabalhado em credito quando ha marcacoes em dia sem expediente", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [marcacao("ENTRADA", "06:30"), marcacao("SAIDA", "11:30")],
      diaInstitucional: {
        tipo: "FERIADO",
        contaComoDiaUtil: false,
        geraApuracaoRegular: false,
        descricao: "Feriado local",
      },
    });

    expect(resultado.resultado).toBe("CREDITO");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.cargaPrevistaMinutos).toBe(0);
    expect(resultado.minutosTrabalhados).toBe(300);
    expect(resultado.minutosCredito).toBe(300);
    expect(resultado.minutosDebito).toBe(0);
    expect(resultado.minutosForaExpediente).toBe(0);
  });

  it("desconsidera tempo anterior as 08:00 sem autorizacao diferenciada", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [marcacao("ENTRADA", "07:00"), marcacao("SAIDA", "15:00")],
    });

    expect(resultado.minutosTrabalhados).toBe(420);
    expect(resultado.minutosForaExpediente).toBe(60);
    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.status).toBe("INCONSISTENTE");
    expect(resultado.ocorrencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: "HORA_NAO_AUTORIZADA",
          minutos: 60,
        }),
      ]),
    );
  });

  it("computa horario entre 06:00 e 19:00 quando formalmente autorizado", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: {
        ...jornada7h,
        horarioDiferenciadoAutorizado: true,
      },
      marcacoes: [marcacao("ENTRADA", "06:00"), marcacao("SAIDA", "13:00")],
    });

    expect(resultado.minutosTrabalhados).toBe(420);
    expect(resultado.minutosForaExpediente).toBe(0);
    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.janelaExpediente).toEqual({
      inicio: "06:00",
      fim: "19:00",
      diferenciada: true,
    });
  });

  it("desconsidera tempo anterior as 06:00 mesmo com autorizacao", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: {
        ...jornada7h,
        horarioDiferenciadoAutorizado: true,
      },
      marcacoes: [marcacao("ENTRADA", "05:30"), marcacao("SAIDA", "13:00")],
    });

    expect(resultado.minutosTrabalhados).toBe(420);
    expect(resultado.minutosForaExpediente).toBe(30);
    expect(resultado.status).toBe("INCONSISTENTE");
  });

  it("recorta os dois turnos da jornada de 8h pela janela padrao", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada8h,
      marcacoes: [
        marcacao("ENTRADA", "07:00"),
        marcacao("SAIDA_INTERVALO", "12:00"),
        marcacao("RETORNO_INTERVALO", "13:00"),
        marcacao("SAIDA", "18:00"),
      ],
    });

    expect(resultado.minutosTrabalhados).toBe(540);
    expect(resultado.minutosForaExpediente).toBe(60);
    expect(resultado.minutosCredito).toBe(60);
    expect(resultado.status).toBe("INCONSISTENTE");
  });
});
