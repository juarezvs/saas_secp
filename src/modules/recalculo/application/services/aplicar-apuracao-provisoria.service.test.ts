import { describe, expect, it } from "vitest";

import type { ResultadoCalculoApuracaoDiaria } from "@/modules/apuracao/application/services/calcular-apuracao-diaria.service";

import {
  aplicarApuracaoProvisoriaDiaNaoEncerrado,
  dataReferenciaNaoEncerrada,
} from "./aplicar-apuracao-provisoria.service";

function calculo(
  resultado: ResultadoCalculoApuracaoDiaria["resultado"],
): ResultadoCalculoApuracaoDiaria {
  return {
    cargaPrevistaMinutos: 420,
    minutosTrabalhados: 0,
    minutosIntervalo: 0,
    minutosCredito: 0,
    minutosDebito: 420,
    resultado,
    status: "INCONSISTENTE",
    primeiraEntrada: resultado === "INCOMPLETA" ? new Date("2026-09-24T12:00:00.000Z") : null,
    saidaIntervalo: null,
    retornoIntervalo: null,
    ultimaSaida: null,
    janelaExpediente: { inicio: "08:00", fim: "15:00", diferenciada: false },
    minutosForaExpediente: 0,
    dispensaPontoEletronico: null,
    trabalhoRemoto: null,
    frequenciaManual: null,
    ocorrencias: [
      {
        tipo: resultado === "FALTA" ? "FALTA" : "DEBITO",
        descricao: "Ocorrencia dependente do fechamento do dia.",
        minutos: 420,
      },
    ],
  };
}

describe("aplicarApuracaoProvisoriaDiaNaoEncerrado", () => {
  it("considera hoje e datas futuras como nao encerradas", () => {
    const agora = new Date("2026-09-24T15:00:00.000Z");

    expect(
      dataReferenciaNaoEncerrada(new Date("2026-09-24T00:00:00.000Z"), agora),
    ).toBe(true);
    expect(
      dataReferenciaNaoEncerrada(new Date("2026-09-25T00:00:00.000Z"), agora),
    ).toBe(true);
    expect(
      dataReferenciaNaoEncerrada(new Date("2026-09-23T00:00:00.000Z"), agora),
    ).toBe(false);
  });

  it("remove debito e inconsistencia de dia atual incompleto", () => {
    const resultado = aplicarApuracaoProvisoriaDiaNaoEncerrado({
      calculo: calculo("INCOMPLETA"),
      dataReferencia: new Date("2026-09-24T00:00:00.000Z"),
      agora: new Date("2026-09-24T15:00:00.000Z"),
    });

    expect(resultado.status).toBe("PENDENTE");
    expect(resultado.resultado).toBe("REGULAR");
    expect(resultado.minutosDebito).toBe(0);
    expect(resultado.ocorrencias).toEqual([]);
  });

  it("mantem debito de data passada", () => {
    const original = calculo("DEBITO");
    const resultado = aplicarApuracaoProvisoriaDiaNaoEncerrado({
      calculo: original,
      dataReferencia: new Date("2026-09-23T00:00:00.000Z"),
      agora: new Date("2026-09-24T15:00:00.000Z"),
    });

    expect(resultado).toBe(original);
  });
});
