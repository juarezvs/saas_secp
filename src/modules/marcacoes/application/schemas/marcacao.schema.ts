import { z } from "zod";

export const registrarMarcacaoSchema = z.object({
  observacao: z
    .string()
    .trim()
    .max(1000, "A observação deve ter no máximo 1000 caracteres.")
    .optional()
    .or(z.literal("")),
  latitude: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  longitude: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
});

export type RegistrarMarcacaoInput = z.infer<typeof registrarMarcacaoSchema>;

export type RegistrarMarcacaoFormState = {
  sucesso: boolean;
  mensagem: string | null;
  tipoMarcacao?: string;
  dataHora?: string;
  erros?: Record<string, string[]>;
  campos?: {
    observacao?: string;
    latitude?: string;
    longitude?: string;
  };
};