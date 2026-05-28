import { z } from "zod";

export const templateFacialSchema = z.object({
  servidorId: z.string().uuid("Servidor inválido.").optional(),
  template: z
    .array(z.number())
    .min(32, "Template facial inválido ou incompleto."),
  qualidade: z.coerce.number().min(0).max(1).optional(),
  metadados: z
    .object({
      algoritmo: z.string().optional(),
      versaoAlgoritmo: z.string().optional(),
      amostras: z.number().optional(),
      origem: z.string().optional(),
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
