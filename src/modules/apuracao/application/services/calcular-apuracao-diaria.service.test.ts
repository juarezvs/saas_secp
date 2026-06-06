import { describe, expect, it } from "vitest";

import { calcularApuracaoDiaria } from "./calcular-apuracao-diaria.service";

const jornada7h = {
  jornadaServidorId: "jornada-servidor-7h",
  cargaDiariaMinutos: 7 * 60,
  exigeIntervalo: false,
  intervaloMinimoMinutos: null,
  intervaloMaximoMinutos: null,
};

const jornada8h = {
  jornadaServidorId: "jornada-servidor-8h",
  cargaDiariaMinutos: 8 * 60,
  exigeIntervalo: true,
  intervaloMinimoMinutos: 60,
  intervaloMaximoMinutos: 180,
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

  it("calcula credito quando a jornada de 7h ultrapassa a carga prevista", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [marcacao("ENTRADA", "08:00"), marcacao("SAIDA", "16:00")],
    });

    expect(resultado.resultado).toBe("CREDITO");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.minutosTrabalhados).toBe(480);
    expect(resultado.minutosCredito).toBe(60);
    expect(resultado.minutosDebito).toBe(0);
  });

  it("calcula debito quando a jornada de 7h fica abaixo da carga prevista", () => {
    const resultado = calcularApuracaoDiaria({
      jornada: jornada7h,
      marcacoes: [marcacao("ENTRADA", "08:00"), marcacao("SAIDA", "14:30")],
    });

    expect(resultado.resultado).toBe("DEBITO");
    expect(resultado.status).toBe("CALCULADA");
    expect(resultado.minutosTrabalhados).toBe(390);
    expect(resultado.minutosCredito).toBe(0);
    expect(resultado.minutosDebito).toBe(30);
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
  });
});
