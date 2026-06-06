import { describe, expect, it } from "vitest";

import type { DesafioFacial } from "../../domain/challenge.types";
import { validarResultadoLiveness } from "./liveness.service";

const desafios: DesafioFacial[] = [
  { id: "11111111-1111-4111-8111-111111111111", tipo: "PISCAR", ordem: 1, tempoLimiteMs: 6000 },
  { id: "22222222-2222-4222-8222-222222222222", tipo: "VIRAR_DIREITA", ordem: 2, tempoLimiteMs: 6000 },
  { id: "33333333-3333-4333-8333-333333333333", tipo: "SORRIR", ordem: 3, tempoLimiteMs: 6000 },
];

describe("liveness.service", () => {
  it("aceita piscar instantaneo e confirmacao curta dos demais gestos", () => {
    const resultado = validarResultadoLiveness({
      desafiosEsperados: desafios,
      resultados: desafios.map((item) => ({
        desafioId: item.id,
        tipo: item.tipo,
        ordem: item.ordem,
        aprovado: true,
        duracaoMs: item.tipo === "PISCAR" ? 1 : 300,
        score: 0.9,
        framesAnalisados:
          item.tipo === "PISCAR" ? 1 : item.tipo === "SORRIR" ? 2 : 3,
      })),
      passivo: {
        framesAnalisados: 40,
        variacaoMediaFrames: 0.02,
        framesQuaseIdenticos: 3,
        multiplasFacesDetectadas: false,
        trocaFaceDetectada: false,
        consistenciaIdentidade: 0.95,
      },
    });

    expect(resultado.aprovado).toBe(true);
    expect(resultado.diagnostico.consistenciaIdentidadeValida).toBe(true);
  });

  it("aprova desafios ordenados com variacao temporal", () => {
    const resultado = validarResultadoLiveness({
      desafiosEsperados: desafios,
      resultados: desafios.map((item) => ({
        desafioId: item.id,
        tipo: item.tipo,
        ordem: item.ordem,
        aprovado: true,
        duracaoMs: 1500,
        score: 0.9,
        framesAnalisados: 8,
      })),
      passivo: {
        framesAnalisados: 40,
        variacaoMediaFrames: 0.02,
        framesQuaseIdenticos: 3,
        multiplasFacesDetectadas: false,
        trocaFaceDetectada: false,
        consistenciaIdentidade: 0.95,
      },
    });

    expect(resultado.aprovado).toBe(true);
  });

  it("reprova sequencia com frames congelados", () => {
    const resultado = validarResultadoLiveness({
      desafiosEsperados: desafios,
      resultados: desafios.map((item) => ({
        desafioId: item.id,
        tipo: item.tipo,
        ordem: item.ordem,
        aprovado: true,
        duracaoMs: 1500,
        score: 0.9,
        framesAnalisados: 8,
      })),
      passivo: {
        framesAnalisados: 40,
        variacaoMediaFrames: 0,
        framesQuaseIdenticos: 40,
        multiplasFacesDetectadas: false,
        trocaFaceDetectada: false,
        consistenciaIdentidade: 0.95,
      },
    });

    expect(resultado.aprovado).toBe(false);
    expect(resultado.diagnostico.variacaoSuficiente).toBe(false);
  });

  it("informa quando a consistencia de identidade reprova a sessao", () => {
    const resultado = validarResultadoLiveness({
      desafiosEsperados: desafios,
      resultados: desafios.map((item) => ({
        desafioId: item.id,
        tipo: item.tipo,
        ordem: item.ordem,
        aprovado: true,
        duracaoMs: 1_500,
        score: 0.9,
        framesAnalisados: 8,
      })),
      passivo: {
        framesAnalisados: 40,
        variacaoMediaFrames: 0.02,
        framesQuaseIdenticos: 3,
        multiplasFacesDetectadas: false,
        trocaFaceDetectada: false,
        consistenciaIdentidade: 0.5,
      },
    });

    expect(resultado.aprovado).toBe(false);
    expect(resultado.diagnostico.consistenciaIdentidadeValida).toBe(false);
  });

  it("reprova quando multiplas faces persistem durante a captura", () => {
    const resultado = validarResultadoLiveness({
      desafiosEsperados: desafios,
      resultados: desafios.map((item) => ({
        desafioId: item.id,
        tipo: item.tipo,
        ordem: item.ordem,
        aprovado: true,
        duracaoMs: 1_500,
        score: 0.9,
        framesAnalisados: 8,
      })),
      passivo: {
        framesAnalisados: 40,
        variacaoMediaFrames: 0.02,
        framesQuaseIdenticos: 3,
        multiplasFacesDetectadas: true,
        trocaFaceDetectada: false,
        consistenciaIdentidade: 0.95,
      },
    });

    expect(resultado.aprovado).toBe(false);
    expect(resultado.diagnostico.apenasUmaPessoa).toBe(false);
  });
});
