import { z } from "zod";

const textoOpcionalWebhook = z.preprocess(
  (valor) => (valor === null ? undefined : valor),
  z
    .string()
    .trim()
    .optional()
    .transform((valor) => valor || undefined),
);

const cpfWebhook = z.preprocess((valor) => {
  if (valor === null || valor === undefined || valor === "") {
    return undefined;
  }

  if (typeof valor !== "string" && typeof valor !== "number") {
    return valor;
  }

  return String(valor).replace(/\D/g, "");
}, z.string().length(11, "Informe um CPF valido.").optional());

export const tiposEventoEquipamentoBiometrico = [
  "MARCACAO",
  "HEARTBEAT",
  "SINCRONIZACAO",
  "ERRO",
] as const;

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

export const equipamentoBiometricoWebhookSchema = z
  .object({
    equipamentoCodigo: z
      .string()
      .trim()
      .min(2, "Informe o codigo do equipamento."),
    tipoEvento: z.enum(tiposEventoEquipamentoBiometrico).default("MARCACAO"),
    codigoEventoExterno: textoOpcionalWebhook,
    nsr: textoOpcionalWebhook,
    cpf: cpfWebhook,
    matricula: textoOpcionalWebhook,
    dataHora: textoOpcionalWebhook,
    payload: z.unknown().optional(),
  })
  .superRefine((dados, ctx) => {
    if (dados.tipoEvento !== "MARCACAO") {
      return;
    }

    if (!dados.cpf && !dados.matricula) {
      ctx.addIssue({
        code: "custom",
        path: ["cpf"],
        message: "Informe CPF ou matricula para registrar a marcacao.",
      });
    }

    if (!dados.dataHora) {
      ctx.addIssue({
        code: "custom",
        path: ["dataHora"],
        message: "Informe a data/hora da marcacao.",
      });
      return;
    }

    if (Number.isNaN(new Date(dados.dataHora).getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["dataHora"],
        message: "Informe uma data/hora valida.",
      });
    }
  });

export type EquipamentoBiometricoWebhookInput = z.infer<
  typeof equipamentoBiometricoWebhookSchema
>;

export const modosAutenticacaoLdapAd = ["HTTP_AD_API", "LDAP_BIND"] as const;

export const ldapActiveDirectorySchema = z
  .object({
    modoAutenticacao: z.enum(modosAutenticacaoLdapAd, {
      error: "Informe o modo de autenticaÃ§Ã£o.",
    }),
    nome: z
      .string()
      .trim()
      .min(3, "Informe o nome da integraÃ§Ã£o.")
      .max(160, "O nome deve ter no mÃ¡ximo 160 caracteres."),
    ativo: z.coerce.boolean().default(true),
    authUrl: z.string().trim().optional().or(z.literal("")),
    ldapUrl: z.string().trim().optional().or(z.literal("")),
    baseDn: z.string().trim().optional().or(z.literal("")),
    dominio: z.string().trim().optional().or(z.literal("")),
    bindDn: z.string().trim().optional().or(z.literal("")),
    bindPassword: z.string().optional().or(z.literal("")),
    userDnPattern: z.string().trim().optional().or(z.literal("")),
    searchFilter: z.string().trim().optional().or(z.literal("")),
    timeoutMs: z.coerce
      .number()
      .int("Informe um tempo limite inteiro.")
      .min(1000, "O tempo limite mÃ­nimo Ã© 1000 ms.")
      .max(60000, "O tempo limite mÃ¡ximo Ã© 60000 ms."),
  })
  .superRefine((dados, ctx) => {
    if (dados.modoAutenticacao === "HTTP_AD_API" && !dados.authUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["authUrl"],
        message: "Informe a URL da API de autenticaÃ§Ã£o do AD.",
      });
    }

    if (dados.modoAutenticacao === "LDAP_BIND") {
      if (!dados.ldapUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["ldapUrl"],
          message: "Informe a URL do servidor LDAP/Active Directory.",
        });
      }

      if (!dados.dominio && !dados.userDnPattern && !dados.baseDn) {
        ctx.addIssue({
          code: "custom",
          path: ["dominio"],
          message:
            "Informe o domÃ­nio, um padrÃ£o de DN do usuÃ¡rio ou uma base DN para busca.",
        });
      }

      if (dados.bindDn && !dados.baseDn) {
        ctx.addIssue({
          code: "custom",
          path: ["baseDn"],
          message: "Informe a base DN para busca quando usar bind tÃ©cnico.",
        });
      }
    }
  });

export type LdapActiveDirectoryInput = z.infer<
  typeof ldapActiveDirectorySchema
>;

export type LdapActiveDirectoryFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<Record<keyof LdapActiveDirectoryInput, string | boolean>>;
};
