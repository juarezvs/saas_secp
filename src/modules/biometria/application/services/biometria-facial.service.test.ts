import { describe, expect, it } from "vitest";

import {
  avaliarPoseParaEtapa,
  classificarPoseFacial,
  normalizarAngulosHuman,
} from "./biometria-facial-config";
import {
  calcularDistanciaCosseno,
  calcularSimilaridadeCosseno,
  calcularTemplateMedio,
  normalizarVetor,
} from "./comparar-template-facial.service";

describe("biometria facial - pose", () => {
  it("converte o yaw do Human para a orientacao percebida pelo usuario", () => {
    expect(normalizarAngulosHuman({ yaw: 20 }).yaw).toBe(-20);
    expect(normalizarAngulosHuman({ yaw: -20 }).yaw).toBe(20);
  });

  it("classifica yaw positivo como esquerda", () => {
    const resultado = classificarPoseFacial({ yaw: 20, pitch: 0, roll: 0 });

    expect(resultado.pose).toBe("ESQUERDA");
    expect(resultado.dentroDoLimite).toBe(true);
  });

  it("classifica yaw negativo como direita", () => {
    const resultado = classificarPoseFacial({ yaw: -20, pitch: 0, roll: 0 });

    expect(resultado.pose).toBe("DIREITA");
    expect(resultado.dentroDoLimite).toBe(true);
  });

  it("rejeita pitch fora do limite", () => {
    const resultado = avaliarPoseParaEtapa({
      etapa: "FRONTAL",
      score: 0.9,
      angulos: { yaw: 0, pitch: 25, roll: 0 },
    });

    expect(resultado.aprovado).toBe(false);
  });

  it("rejeita score baixo", () => {
    const resultado = avaliarPoseParaEtapa({
      etapa: "FRONTAL",
      score: 0.2,
      angulos: { yaw: 0, pitch: 0, roll: 0 },
    });

    expect(resultado.aprovado).toBe(false);
  });
});

describe("biometria facial - templates", () => {
  it("normaliza vetor facial", () => {
    const normalizado = normalizarVetor([3, 4]);

    expect(normalizado[0]).toBeCloseTo(0.6);
    expect(normalizado[1]).toBeCloseTo(0.8);
  });

  it("calcula similaridade e distancia para vetores iguais", () => {
    const similaridade = calcularSimilaridadeCosseno([1, 0], [1, 0]);
    const distancia = calcularDistanciaCosseno([1, 0], [1, 0]);

    expect(similaridade).toBeCloseTo(1);
    expect(distancia).toBeCloseTo(0);
  });

  it("rejeita dimensoes diferentes", () => {
    expect(() => calcularSimilaridadeCosseno([1, 0], [1, 0, 0])).toThrow(
      /dimensoes/,
    );
  });

  it("calcula template medio normalizado", () => {
    const medio = calcularTemplateMedio([
      [1, 0],
      [1, 0],
      [1, 0],
    ]);

    expect(medio[0]).toBeCloseTo(1);
    expect(medio[1]).toBeCloseTo(0);
  });
});
