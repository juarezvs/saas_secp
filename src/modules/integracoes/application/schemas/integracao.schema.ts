import { z } from "zod";

export const equipamentoBiometricoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(2, "Informe o código do equipamento.")
    .max(80, "O código deve ter no máximo 80 caracteres."),
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome do equipamento.")
    .max(160, "O nome deve ter no máximo 160 caracteres."),
  unidadeId: z.string().uuid().optional().or(z.literal("")),
  fabricante: z.string().trim().optional().or(z.literal("")),
  modelo: z.string().trim().optional().or(z.literal("")),
  numeroSerie: z.string().trim().optional().or(z.literal("")),
  localizacao: z.string().trim().optional().or(z.literal("")),
  ip: z.string().trim().optional().or(z.literal("")),
  porta: z.coerce.number().int().positive().optional().or(z.literal("")),
  ativo: z.coerce.boolean().default(true),
});

export type EquipamentoBiometricoInput = z.infer<
  typeof equipamentoBiometricoSchema
>;

export type EquipamentoBiometricoFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<Record<keyof EquipamentoBiometricoInput, string | boolean>>;
};
