import { describe, expect, it } from "vitest";
import { reconhecerCandidatoTotemSeguro } from "./totem-reconhecimento-facial.service";

describe("reconhecerCandidatoTotemSeguro", () => {
  it("aprova candidato com similaridade alta, qualidade boa e margem clara", () => {
    const resultado = reconhecerCandidatoTotemSeguro({
      qualidade: 0.91,
      yaw: 2,
      pitch: 1,
      roll: 1,
      candidatos: [
        { biometria: { id: "am200401" }, distancia: 0.1, similaridade: 0.9 },
        { biometria: { id: "am200029" }, distancia: 0.24, similaridade: 0.76 },
      ],
    });

    expect(resultado.seguro).toBe(true);
    if (resultado.seguro) {
      expect(resultado.melhor.biometria).toEqual({ id: "am200401" });
    }
  });

  it("rejeita candidato abaixo de 85 por cento de similaridade", () => {
    const resultado = reconhecerCandidatoTotemSeguro({
      qualidade: 0.91,
      candidatos: [
        { biometria: { id: "am200029" }, distancia: 0.16, similaridade: 0.84 },
      ],
    });

    expect(resultado.seguro).toBe(false);
    if (!resultado.seguro) {
      expect(resultado.motivo).toContain("sem correspondencia confiavel");
    }
  });

  it("rejeita reconhecimento ambiguo quando o segundo candidato esta perto", () => {
    const resultado = reconhecerCandidatoTotemSeguro({
      qualidade: 0.91,
      candidatos: [
        { biometria: { id: "am200029" }, distancia: 0.1, similaridade: 0.9 },
        { biometria: { id: "am200401" }, distancia: 0.13, similaridade: 0.87 },
      ],
    });

    expect(resultado.seguro).toBe(false);
    if (!resultado.seguro) {
      expect(resultado.motivo).toContain("ambiguo");
    }
  });

  it("rejeita face com baixa qualidade", () => {
    const resultado = reconhecerCandidatoTotemSeguro({
      qualidade: 0.7,
      candidatos: [
        { biometria: { id: "am200401" }, distancia: 0.05, similaridade: 0.95 },
      ],
    });

    expect(resultado.seguro).toBe(false);
    if (!resultado.seguro) {
      expect(resultado.motivo).toContain("baixa qualidade");
    }
  });

  it("rejeita face fora do enquadramento frontal seguro", () => {
    const resultado = reconhecerCandidatoTotemSeguro({
      qualidade: 0.91,
      yaw: 22,
      candidatos: [
        { biometria: { id: "am200401" }, distancia: 0.05, similaridade: 0.95 },
      ],
    });

    expect(resultado.seguro).toBe(false);
    if (!resultado.seguro) {
      expect(resultado.motivo).toContain("enquadramento frontal seguro");
    }
  });
});
