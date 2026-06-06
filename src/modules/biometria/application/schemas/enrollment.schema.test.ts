import { describe, expect, it } from "vitest";

import { concluirEnrollmentSchema } from "./enrollment.schema";

const UUIDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
] as const;

describe("concluirEnrollmentSchema", () => {
  it("aceita a conclusao produzida pelo fluxo facial", () => {
    const resultado = concluirEnrollmentSchema.safeParse(criarPayload());

    expect(resultado.success).toBe(true);
  });

  it("rejeita desafio concluido fora do tempo permitido", () => {
    const payload = criarPayload();
    payload.desafios[0].duracaoMs = 6_001;

    const resultado = concluirEnrollmentSchema.safeParse(payload);

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.path).toEqual([
        "desafios",
        0,
        "duracaoMs",
      ]);
    }
  });
});

function criarPayload() {
  return {
    sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    nonce: "a".repeat(43),
    consentimento: true as const,
    desafios: UUIDS.map((desafioId, index) => ({
      desafioId,
      tipo: ["PISCAR", "VIRAR_DIREITA", "SORRIR"][index] as
        | "PISCAR"
        | "VIRAR_DIREITA"
        | "SORRIR",
      ordem: index + 1,
      aprovado: true,
      duracaoMs: 1_200,
      score: 0.9,
      framesAnalisados: 4,
    })),
    livenessPassivo: {
      framesAnalisados: 30,
      variacaoMediaFrames: 0.02,
      framesQuaseIdenticos: 2,
      multiplasFacesDetectadas: false,
      trocaFaceDetectada: false,
      consistenciaIdentidade: 0.95,
    },
    amostras: ["FRONTAL", "ESQUERDA", "DIREITA"].map(
      (pose, index) => ({
        pose: pose as "FRONTAL" | "ESQUERDA" | "DIREITA",
        template: Array.from({ length: 64 }, (_, item) =>
          item === index ? 1 : 0,
        ),
        qualidade: 0.9,
        scoreDeteccao: 0.9,
        timestamp: new Date().toISOString(),
        hashFrame: `${index}`.repeat(64),
      }),
    ),
  };
}
