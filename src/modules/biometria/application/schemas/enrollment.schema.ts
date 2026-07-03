import { z } from "zod";

import { POSES_AMOSTRA_FACIAL } from "../../domain/biometria-facial.types";
import { REGRAS_ENROLLMENT_FACIAL } from "../../domain/biometria-facial.rules";
import { TIPOS_DESAFIO_FACIAL } from "../../domain/challenge.types";

export const iniciarEnrollmentSchema = z.object({
  consentimento: z.literal(true, {
    error: "O consentimento informado é obrigatório.",
  }),
  modo: z.enum(["cadastro", "recadastro"]).default("cadastro"),
});

const resultadoDesafioSchema = z.object({
  desafioId: z.string().uuid(),
  tipo: z.enum(TIPOS_DESAFIO_FACIAL),
  ordem: z.number().int().positive(),
  aprovado: z.boolean(),
  duracaoMs: z
    .number()
    .int()
    .positive()
    .max(
      REGRAS_ENROLLMENT_FACIAL.tempoDesafioMs,
      "O movimento facial excedeu o tempo permitido.",
    ),
  score: z.number().min(0).max(1),
  framesAnalisados: z.number().int().nonnegative(),
});

const metricasPassivasSchema = z.object({
  framesAnalisados: z.number().int().nonnegative(),
  variacaoMediaFrames: z.number().min(0).max(1),
  framesQuaseIdenticos: z.number().int().nonnegative(),
  multiplasFacesDetectadas: z.boolean(),
  trocaFaceDetectada: z.boolean(),
  consistenciaIdentidade: z.number().min(0).max(1),
});

const amostraSchema = z.object({
  pose: z.enum(POSES_AMOSTRA_FACIAL),
  template: z
    .array(z.number().finite())
    .min(32)
    .max(4096),
  qualidade: z.number().min(0).max(1),
  scoreDeteccao: z.number().min(0).max(1),
  timestamp: z.string().datetime(),
  hashFrame: z.string().min(16).max(128),
});

export const concluirEnrollmentSchema = z.object({
  sessionId: z.string().uuid(),
  nonce: z.string().min(32).max(256),
  consentimento: z.literal(true),
  desafios: z.array(resultadoDesafioSchema).min(3).max(3),
  livenessPassivo: metricasPassivasSchema,
  amostras: z
    .array(amostraSchema)
    .length(
      POSES_AMOSTRA_FACIAL.length,
      `O cadastro deve conter ${POSES_AMOSTRA_FACIAL.length} amostras faciais.`,
    ),
  metadados: z.record(z.string(), z.unknown()).optional(),
});
