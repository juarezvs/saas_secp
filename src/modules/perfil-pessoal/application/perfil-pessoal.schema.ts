import { z } from "zod";

const telefoneSchema = z
  .string()
  .transform((valor) => valor.replace(/\D/g, ""))
  .refine((valor) => valor.length === 10 || valor.length === 11, {
    message: "Informe o telefone com DDD.",
  });

export const perfilPessoalSchema = z.object({
  cep: z.string().transform((valor) => valor.replace(/\D/g, "")).refine((valor) => valor.length === 8, "Informe um CEP válido."),
  endereco: z.string().trim().min(1, "Informe o endereço.").max(200),
  bairro: z.string().trim().min(1, "Informe o bairro.").max(100),
  cidade: z.string().trim().min(1, "Informe a cidade.").max(100),
  uf: z.string().trim().length(2, "Informe a UF.").transform((valor) => valor.toUpperCase()),
  numeroResidencia: z.string().trim().min(1).max(20),
  complemento: z.string().trim().max(100),
  email: z.string().trim().email("Informe um e-mail válido.").max(100),
  telefones: z.array(telefoneSchema).min(1, "Informe ao menos um telefone.").max(4, "Informe no máximo quatro telefones.").refine(
    (itens) => new Set(itens).size === itens.length,
    "Não repita o mesmo telefone.",
  ),
  altura: z.string().trim().regex(/^\d{1,2}([,.]\d{1,2})?$/, "Use o formato 99,99."),
  raca: z.string().trim().min(1),
  corCabelo: z.string().trim().min(1),
  corOlhos: z.string().trim().min(1),
  tipoSanguineo: z.string().trim().min(1),
  identidadeGenero: z.string().trim().min(1),
});

export type PerfilPessoalInput = z.infer<typeof perfilPessoalSchema>;

