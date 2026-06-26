import { z } from "zod";

function fusoHorarioValido(valor: string) {
  try {
    Intl.DateTimeFormat("pt-BR", { timeZone: valor }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const fusoHorarioSchema = z.object({
  valor: z
    .string()
    .trim()
    .min(3, "Informe o identificador IANA do fuso.")
    .max(80, "O identificador deve ter no maximo 80 caracteres.")
    .refine(fusoHorarioValido, "Informe um fuso horario IANA valido."),
  rotulo: z
    .string()
    .trim()
    .min(3, "Informe o rotulo do fuso.")
    .max(120, "O rotulo deve ter no maximo 120 caracteres."),
  descricao: z.string().trim().max(1000).optional().or(z.literal("")),
  ativo: z.coerce.boolean().default(true),
});

export type FusoHorarioInput = z.infer<typeof fusoHorarioSchema>;

export type FusoHorarioFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<FusoHorarioInput>;
};
