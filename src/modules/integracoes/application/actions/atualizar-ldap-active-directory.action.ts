"use server";

import { revalidatePath } from "next/cache";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  LDAP_ACTIVE_DIRECTORY_INTEGRACAO_ID,
  obterConfiguracaoLdapActiveDirectory,
} from "../services/ldap-active-directory-config.service";
import {
  ldapActiveDirectorySchema,
  type LdapActiveDirectoryFormState,
} from "../schemas/integracao.schema";

function extrairDados(formData: FormData) {
  return {
    modoAutenticacao: String(formData.get("modoAutenticacao") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    authUrl: String(formData.get("authUrl") ?? "").trim(),
    ldapUrl: String(formData.get("ldapUrl") ?? "").trim(),
    baseDn: String(formData.get("baseDn") ?? "").trim(),
    dominio: String(formData.get("dominio") ?? "").trim(),
    bindDn: String(formData.get("bindDn") ?? "").trim(),
    bindPassword: String(formData.get("bindPassword") ?? ""),
    userDnPattern: String(formData.get("userDnPattern") ?? "").trim(),
    searchFilter: String(formData.get("searchFilter") ?? "").trim(),
    timeoutMs: String(formData.get("timeoutMs") ?? "").trim(),
  };
}

export async function atualizarLdapActiveDirectoryAction(
  _estadoAnterior: LdapActiveDirectoryFormState,
  formData: FormData,
): Promise<LdapActiveDirectoryFormState> {
  const permissao = await exigirPermissao("integracoes:gerenciar:global");
  const dados = extrairDados(formData);
  const parsed = ldapActiveDirectorySchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os parÃ¢metros de autenticaÃ§Ã£o.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const atual = await obterConfiguracaoLdapActiveDirectory();
  const novaSenhaBind = parsed.data.bindPassword ?? "";
  const bindPassword =
    novaSenhaBind.trim().length > 0 ? novaSenhaBind : atual.bindPassword;
  const status = parsed.data.ativo
    ? parsed.data.modoAutenticacao === "HTTP_AD_API"
      ? parsed.data.authUrl
        ? "ATIVA"
        : "NAO_CONFIGURADA"
      : parsed.data.ldapUrl
        ? "ATIVA"
        : "NAO_CONFIGURADA"
    : "INATIVA";
  const baseUrl =
    parsed.data.modoAutenticacao === "HTTP_AD_API"
      ? parsed.data.authUrl
      : parsed.data.ldapUrl;

  const integracao = await prisma.integracaoSistema.upsert({
    where: { id: LDAP_ACTIVE_DIRECTORY_INTEGRACAO_ID },
    update: {
      nome: parsed.data.nome,
      tipo: "LDAP",
      direcao: "ENTRADA",
      status,
      baseUrl: baseUrl || null,
      ativo: parsed.data.ativo,
      descricao:
        "IntegraÃ§Ã£o usada pelo login institucional do SECP para autenticaÃ§Ã£o por LDAP/Active Directory.",
      configuracao: {
        modoAutenticacao: parsed.data.modoAutenticacao,
        authUrl: parsed.data.authUrl,
        ldapUrl: parsed.data.ldapUrl,
        baseDn: parsed.data.baseDn,
        dominio: parsed.data.dominio,
        bindDn: parsed.data.bindDn,
        bindPassword,
        userDnPattern: parsed.data.userDnPattern,
        searchFilter: parsed.data.searchFilter,
        timeoutMs: parsed.data.timeoutMs,
      },
    },
    create: {
      id: LDAP_ACTIVE_DIRECTORY_INTEGRACAO_ID,
      nome: parsed.data.nome,
      tipo: "LDAP",
      direcao: "ENTRADA",
      status,
      baseUrl: baseUrl || null,
      ativo: parsed.data.ativo,
      descricao:
        "IntegraÃ§Ã£o usada pelo login institucional do SECP para autenticaÃ§Ã£o por LDAP/Active Directory.",
      configuracao: {
        modoAutenticacao: parsed.data.modoAutenticacao,
        authUrl: parsed.data.authUrl,
        ldapUrl: parsed.data.ldapUrl,
        baseDn: parsed.data.baseDn,
        dominio: parsed.data.dominio,
        bindDn: parsed.data.bindDn,
        bindPassword,
        userDnPattern: parsed.data.userDnPattern,
        searchFilter: parsed.data.searchFilter,
        timeoutMs: parsed.data.timeoutMs,
      },
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
      entidade: "IntegracaoSistema",
      entidadeId: integracao.id,
      acao: "LDAP_ACTIVE_DIRECTORY_CONFIGURADO",
      dadosDepois: {
        id: integracao.id,
        nome: integracao.nome,
        tipo: integracao.tipo,
        status: integracao.status,
        ativo: integracao.ativo,
        baseUrl: integracao.baseUrl,
        configuracao: {
          ...parsed.data,
          bindPassword: bindPassword ? "[REDACTED]" : "",
        },
      },
    },
  });

  revalidatePath("/administracao/integracoes");
  revalidatePath("/administracao/integracoes/ldap");

  return {
    sucesso: true,
    mensagem: "ParÃ¢metros de LDAP/Active Directory atualizados com sucesso.",
  };
}
