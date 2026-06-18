import { z } from "zod";

const dataObrigatoriaSchema = z
  .string()
  .trim()
  .min(1, "Informe a data de inicio.");

const dataOpcionalSchema = z.string().trim().optional().or(z.literal(""));

export const dispensaPontoServidorSchema = z.object({
  servidorId: z.string().uuid("Informe o servidor."),
  motivo: z
    .string()
    .trim()
    .min(5, "Informe o motivo da dispensa.")
    .max(250, "O motivo deve ter no maximo 250 caracteres."),
  atoAutorizativo: z
    .string()
    .trim()
    .max(120, "O ato autorizativo deve ter no maximo 120 caracteres.")
    .optional()
    .or(z.literal("")),
  processoSei: z
    .string()
    .trim()
    .max(120, "O processo SEI deve ter no maximo 120 caracteres.")
    .optional()
    .or(z.literal("")),
  observacao: z.string().trim().optional().or(z.literal("")),
  dataInicio: dataObrigatoriaSchema,
  dataFim: dataOpcionalSchema,
  exigeFrequenciaManual: z.coerce.boolean().default(true),
});

export const encerrarDispensaPontoServidorSchema = z.object({
  dataFim: dataObrigatoriaSchema,
});

export type DispensaPontoServidorInput = z.infer<
  typeof dispensaPontoServidorSchema
>;

export type EncerrarDispensaPontoServidorInput = z.infer<
  typeof encerrarDispensaPontoServidorSchema
>;

export type DispensaPontoServidorFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<DispensaPontoServidorInput>;
};

export type EncerrarDispensaPontoServidorFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<EncerrarDispensaPontoServidorInput>;
};
