import { z } from "zod";

export const tiposVinculoServidor = [
  "EFETIVO",
  "CEDIDO",
  "REQUISITADO",
  "REDISTRIBUIDO",
  "REMOVIDO",
  "EXERCICIO_PROVISORIO",
] as const;

const cpfSchema = z
  .preprocess((valor) => {
    if (valor === undefined || valor === null) {
      return "";
    }

    return String(valor).replace(/\D/g, "");
  }, z.string())
  .refine((valor) => !valor || valor.length === 11, {
    message: "CPF deve conter 11 dígitos.",
  });

export const servidorSchema = z.object({
  orgaoId: z.string().uuid("Informe o órgão."),
  matricula: z
    .string()
    .trim()
    .min(2, "Informe uma matrícula com pelo menos 2 caracteres.")
    .max(50, "A matrícula deve ter no máximo 50 caracteres."),
  cpf: cpfSchema,
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome do servidor.")
    .max(200, "O nome deve ter no máximo 200 caracteres."),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .optional()
    .or(z.literal("")),
  nomeFuncional: z
    .string()
    .trim()
    .max(200, "O nome funcional deve ter no máximo 200 caracteres.")
    .optional()
    .or(z.literal("")),
  vinculo: z.enum(tiposVinculoServidor, {
    error: "Informe um tipo de vínculo válido.",
  }),
  ativo: z.coerce.boolean().default(true),
});

export type ServidorInput = z.infer<typeof servidorSchema>;

export type ServidorFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    orgaoId?: string;
    matricula?: string;
    nome?: string;
    email?: string;
    nomeFuncional?: string;
    vinculo?: string;
    ativo?: boolean;
  };
};
