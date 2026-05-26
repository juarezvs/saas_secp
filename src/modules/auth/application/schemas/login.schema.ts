import { z } from "zod";

export const loginSchema = z.object({
  matricula: z
    .string()
    .trim()
    .min(1, "Informe a matrícula.")
    .max(50, "A matrícula deve ter no máximo 50 caracteres."),
  senha: z
    .string()
    .min(1, "Informe a senha.")
    .max(200, "A senha deve ter no máximo 200 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;