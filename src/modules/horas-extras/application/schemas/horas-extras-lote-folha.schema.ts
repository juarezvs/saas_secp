import { z } from "zod";

export const gerarLoteFolhaHorasExtrasSchema = z.object({
  orgaoId: z.string().uuid("Informe o orgao."),
  competence: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Informe a competencia no formato AAAA-MM."),
});

export type GerarLoteFolhaHorasExtrasInput = z.infer<
  typeof gerarLoteFolhaHorasExtrasSchema
>;

export type GerarLoteFolhaHorasExtrasFormState = {
  sucesso: boolean;
  mensagem?: string;
  erros?: Record<string, string[]>;
  campos?: Partial<GerarLoteFolhaHorasExtrasInput>;
};
