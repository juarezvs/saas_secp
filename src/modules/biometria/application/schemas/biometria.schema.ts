import { z } from "zod";

import { BIOMETRIA_FACIAL_THRESHOLDS } from "../services/biometria-facial-config";

export const templateFacialSchema = z.object({
  servidorId: z.string().uuid("Servidor inválido.").optional(),
  template: z
    .array(z.number())
    .min(
      BIOMETRIA_FACIAL_THRESHOLDS.minTemplateDimensao,
      "Template facial inválido ou incompleto.",
    )
    .refine(
      (valores) => valores.every((valor) => Number.isFinite(valor)),
      "Template facial contém valores inválidos.",
    ),
  qualidade: z.coerce.number().min(0).max(1).optional(),
  metadados: z
    .object({
      algoritmo: z.string().optional(),
      versaoAlgoritmo: z.string().optional(),
      amostras: z.number().optional(),
      origem: z.string().optional(),
      pose: z.string().optional(),
      yaw: z.number().optional(),
      pitch: z.number().optional(),
      roll: z.number().optional(),
    })
    .optional(),
});

export type TemplateFacialInput = z.infer<typeof templateFacialSchema>;

export type BiometriaFormState = {
  sucesso: boolean;
  mensagem: string | null;
  distancia?: number;
  similaridade?: number;
  autorizacaoId?: string;
  autorizacaoToken?: string;
  expiraEm?: string;
};
