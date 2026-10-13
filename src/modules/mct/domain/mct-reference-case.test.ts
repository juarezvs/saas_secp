import { describe, expect, it } from "vitest";
import { normalizarEventosTemporais } from "./normalizador-temporal";
import { executarRelogioConformidade } from "./relogio-conformidade";
import { executarRelogioJornada } from "./relogio-jornada";
import { segmentarIntervalos } from "./segmentador-temporal";

const data = (hora: string) => new Date(`2026-10-13T${hora}:00-04:00`);

const eventos = [
  { id: "1", ocorridoEm: data("08:20"), tipo: "ENTRADA" as const, fonte: "TESTE" },
  { id: "2", ocorridoEm: data("12:10"), tipo: "INICIO_INTERVALO" as const, fonte: "TESTE" },
  { id: "3", ocorridoEm: data("13:30"), tipo: "FIM_INTERVALO" as const, fonte: "TESTE" },
  { id: "4", ocorridoEm: data("18:15"), tipo: "SAIDA" as const, fonte: "TESTE" },
];

const politica = {
  id: "politica-1",
  versao: 1,
  orgaoId: "orgao-1",
  vigenciaInicio: data("00:00"),
  cargaExigivelMinutos: 420,
  referencia: { inicio: data("08:00"), fim: data("15:00") },
  intervaloMinimoMinutos: 60,
  intervaloMaximoMinutos: 120,
};

describe("MCT - caso obrigatorio de referencia", () => {
  it("apura RJ e RC independentemente e nao credita o excedente", () => {
    const normalizado = normalizarEventosTemporais(eventos);
    const jornada = executarRelogioJornada({
      politica,
      intervalosTrabalhados: normalizado.intervalosTrabalhados,
    });
    const conformidade = executarRelogioConformidade({
      politica,
      intervalosTrabalhados: normalizado.intervalosTrabalhados,
    });

    expect(normalizado.pendencias).toEqual([]);
    expect(normalizado.intervalosTrabalhados.map((intervalo) => (intervalo.fim.getTime() - intervalo.inicio.getTime()) / 60_000)).toEqual([230, 285]);
    expect(jornada.tempoEfetivamenteTrabalhadoMinutos).toBe(515);
    expect(jornada.intervalosNaoComputaveisMinutos).toBe(80);
    expect(jornada.excedenteBrutoMinutos).toBe(95);
    expect(jornada.creditoReconhecidoMinutos).toBe(0);
    expect(jornada.excedentePendenteMinutos).toBe(95);
    expect(jornada.jornadaCompletadaEm).toEqual(data("16:40"));
    expect(conformidade.fatos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: "ENTRADA_APOS_REFERENCIA", minutos: 20 }),
        expect.objectContaining({ codigo: "SAIDA_APOS_REFERENCIA", minutos: 195 }),
      ]),
    );
  });

  it("segmenta sem criar ou eliminar minutos", () => {
    const normalizado = normalizarEventosTemporais(eventos);
    const segmentos = segmentarIntervalos({
      intervalos: normalizado.intervalosTrabalhados,
      marcos: [{ instante: data("16:40"), codigo: "JORNADA_COMPLETA" }],
    });

    expect(segmentos.reduce((total, segmento) => total + segmento.minutos, 0)).toBe(515);
    expect(segmentos.every((segmento) => segmento.inicio < segmento.fim)).toBe(true);
  });

  it("e deterministico para a mesma entrada", () => {
    const primeira = normalizarEventosTemporais(eventos);
    const segunda = normalizarEventosTemporais([...eventos].reverse());

    expect(segunda).toEqual(primeira);
  });
});

