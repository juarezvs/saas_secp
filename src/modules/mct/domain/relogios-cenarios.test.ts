import { describe, expect, it } from "vitest";
import type { IntervaloTrabalhado, PoliticaJornadaMct } from "./mct.types";
import { executarRelogioConformidade } from "./relogio-conformidade";
import { executarRelogioJornada } from "./relogio-jornada";

const instante = (dia: string, hora: string) =>
  new Date(`${dia}T${hora}:00-04:00`);

function intervalo(
  inicio: string,
  fim: string,
  diaInicio = "2026-10-13",
  diaFim = diaInicio,
): IntervaloTrabalhado {
  return {
    inicio: instante(diaInicio, inicio),
    fim: instante(diaFim, fim),
    eventoEntradaId: `${inicio}-e`,
    eventoSaidaId: `${fim}-s`,
  };
}

function politica(
  cargaExigivelMinutos: number,
  extras: Partial<PoliticaJornadaMct> = {},
): PoliticaJornadaMct {
  return {
    id: "politica",
    versao: 1,
    orgaoId: "orgao",
    vigenciaInicio: instante("2026-01-01", "00:00"),
    cargaExigivelMinutos,
    ...extras,
  };
}

describe("Relogio de Jornada", () => {
  it.each([
    ["continua de 7h", 420, [intervalo("08:00", "15:00")], 420, 0],
    ["reduzida de 6h", 360, [intervalo("08:00", "14:00")], 360, 0],
    [
      "8h com almoco",
      480,
      [intervalo("08:00", "12:00"), intervalo("13:00", "17:00")],
      480,
      0,
    ],
    ["saida antecipada", 420, [intervalo("08:00", "14:30")], 390, 30],
    [
      "multiplas entradas",
      420,
      [
        intervalo("08:00", "10:00"),
        intervalo("10:15", "12:00"),
        intervalo("13:00", "16:15"),
      ],
      420,
      0,
    ],
    [
      "plantao 12h noturno",
      720,
      [intervalo("20:00", "08:00", "2026-10-13", "2026-10-14")],
      720,
      0,
    ],
  ])("apura %s", (_nome, carga, intervalos, trabalhado, faltante) => {
    const resultado = executarRelogioJornada({
      politica: politica(carga as number),
      intervalosTrabalhados: intervalos as IntervaloTrabalhado[],
    });
    expect(resultado.tempoEfetivamenteTrabalhadoMinutos).toBe(trabalhado);
    expect(resultado.tempoFaltanteMinutos).toBe(faltante);
  });

  it("nao transforma falta quantitativa em debito sem decisao", () => {
    const base = executarRelogioJornada({
      politica: politica(420),
      intervalosTrabalhados: [intervalo("08:00", "14:00")],
    });
    const reconhecido = executarRelogioJornada({
      politica: politica(420),
      intervalosTrabalhados: [intervalo("08:00", "14:00")],
      debitoReconhecidoMinutos: 60,
    });

    expect(base.tempoFaltanteMinutos).toBe(60);
    expect(base.debitoReconhecidoMinutos).toBe(0);
    expect(reconhecido.debitoReconhecidoMinutos).toBe(60);
  });

  it("limita credito autorizado ao excedente existente", () => {
    const resultado = executarRelogioJornada({
      politica: politica(420),
      intervalosTrabalhados: [intervalo("08:00", "16:00")],
      creditoReconhecidoMinutos: 120,
    });

    expect(resultado.excedenteBrutoMinutos).toBe(60);
    expect(resultado.creditoReconhecidoMinutos).toBe(60);
    expect(resultado.excedentePendenteMinutos).toBe(0);
  });

  it("distingue exercicio reconhecido de trabalho efetivo", () => {
    const resultado = executarRelogioJornada({
      politica: politica(420),
      intervalosTrabalhados: [intervalo("08:00", "13:00")],
      minutosReconhecidosComoExercicio: 120,
    });

    expect(resultado.tempoEfetivamenteTrabalhadoMinutos).toBe(300);
    expect(resultado.tempoComputavelMinutos).toBe(420);
    expect(resultado.tempoFaltanteMinutos).toBe(0);
  });
});

describe("Relogio de Conformidade", () => {
  it("diferencia atraso compensado no mesmo dia", () => {
    const regra = politica(420, {
      referencia: {
        inicio: instante("2026-10-13", "08:00"),
        fim: instante("2026-10-13", "15:00"),
      },
      permiteCompensacaoNoDia: true,
    });
    const intervalos = [intervalo("08:20", "15:20")];
    const jornada = executarRelogioJornada({
      politica: regra,
      intervalosTrabalhados: intervalos,
    });
    const resultado = executarRelogioConformidade({
      politica: regra,
      intervalosTrabalhados: intervalos,
      resultadoJornada: jornada,
    });

    expect(resultado.fatos).toContainEqual(
      expect.objectContaining({
        codigo: "ENTRADA_TARDIA_COMPENSADA",
        categoria: "REGULAR",
        minutos: 20,
      }),
    );
    expect(resultado.possuiPendencias).toBe(false);
  });

  it("mantem atraso pendente quando nao houve compensacao", () => {
    const regra = politica(420, {
      referencia: {
        inicio: instante("2026-10-13", "08:00"),
        fim: instante("2026-10-13", "15:00"),
      },
      permiteCompensacaoNoDia: true,
    });
    const intervalos = [intervalo("08:20", "15:00")];
    const jornada = executarRelogioJornada({
      politica: regra,
      intervalosTrabalhados: intervalos,
    });
    const resultado = executarRelogioConformidade({
      politica: regra,
      intervalosTrabalhados: intervalos,
      resultadoJornada: jornada,
    });

    expect(resultado.fatos).toContainEqual(
      expect.objectContaining({
        codigo: "ENTRADA_APOS_REFERENCIA",
        categoria: "PENDENTE",
      }),
    );
  });

  it("nao classifica entrada tardia em jornada flexivel", () => {
    const regra = politica(420, {
      referencia: {
        inicio: instante("2026-10-13", "08:00"),
        fim: instante("2026-10-13", "15:00"),
      },
      permiteFlexibilidade: true,
    });
    const intervalos = [intervalo("09:00", "16:00")];
    const jornada = executarRelogioJornada({
      politica: regra,
      intervalosTrabalhados: intervalos,
    });
    const resultado = executarRelogioConformidade({
      politica: regra,
      intervalosTrabalhados: intervalos,
      resultadoJornada: jornada,
    });

    expect(resultado.fatos.map((fato) => fato.codigo)).not.toContain(
      "ENTRADA_APOS_REFERENCIA",
    );
    expect(resultado.fatos.map((fato) => fato.codigo)).not.toContain(
      "SAIDA_APOS_REFERENCIA",
    );
    expect(resultado.possuiPendencias).toBe(false);
  });

  it.each([
    ["insuficiente", 30, "INTERVALO_INSUFICIENTE"],
    ["excessivo", 150, "INTERVALO_EXCESSIVO"],
  ])("classifica intervalo %s", (_nome, minutos, codigo) => {
    const retorno = new Date(
      instante("2026-10-13", "12:00").getTime() + (minutos as number) * 60_000,
    );
    const resultado = executarRelogioConformidade({
      politica: politica(420, {
        intervaloMinimoMinutos: 60,
        intervaloMaximoMinutos: 120,
      }),
      intervalosTrabalhados: [
        intervalo("08:00", "12:00"),
        {
          inicio: retorno,
          fim: instante("2026-10-13", "17:00"),
          eventoEntradaId: "retorno",
          eventoSaidaId: "saida",
        },
      ],
    });
    expect(resultado.fatos.map((fato) => fato.codigo)).toContain(codigo);
  });
});
