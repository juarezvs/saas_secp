"use server";

import { revalidatePath } from "next/cache";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import type { StatusIntegracao } from "@/generated/prisma/client";

import {
  LDAP_ACTIVE_DIRECTORY_INTEGRACAO_ID,
  obterConfiguracaoLdapActiveDirectory,
} from "../services/ldap-active-directory-config.service";
import {
  ldapActiveDirectorySchema,
  type LdapActiveDirectoryFormState,
} from "../schemas/integracao.schema";

function normalizarLdapUrl(valor: string) {
  const texto = valor.trim();

  if (!texto || /^ldaps?:\/\//i.test(texto)) {
    return texto;
  }

  return `ldap://${texto}`;
}

function extrairDados(formData: FormData) {
  return {
    orgaoId: String(formData.get("orgaoId") ?? "").trim(),
    modoAutenticacao: String(formData.get("modoAutenticacao") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    authUrl: String(formData.get("authUrl") ?? "").trim(),
    ldapUrl: normalizarLdapUrl(String(formData.get("ldapUrl") ?? "")),
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
      mensagem: "Verifique os parâmetros de autenticação.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const orgaoId = parsed.data.orgaoId || null;
  const escopo = await obterEscopoOrgaoDaSessao();

  if (!escopo.global && (!orgaoId || !escopo.orgaoIds.includes(orgaoId))) {
    return {
      sucesso: false,
      mensagem: "Seccional fora do escopo do perfil ativo.",
      campos: dados,
    };
  }

  const atual = await obterConfiguracaoLdapActiveDirectory(orgaoId);
  const novaSenhaBind = parsed.data.bindPassword ?? "";
  const bindPassword =
    novaSenhaBind.trim().length > 0 ? novaSenhaBind : atual.bindPassword;
  const status: StatusIntegracao = parsed.data.ativo
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

  const existente = orgaoId
    ? await prisma.integracaoSistema.findFirst({
        where: { tipo: "LDAP", orgaoId },
        select: { id: true },
      })
    : await prisma.integracaoSistema.findUnique({
        where: { id: LDAP_ACTIVE_DIRECTORY_INTEGRACAO_ID },
        select: { id: true },
      });
  const dadosIntegracao = {
    orgaoId,
    nome: parsed.data.nome,
    tipo: "LDAP" as const,
    direcao: "ENTRADA" as const,
    status,
    baseUrl: baseUrl || null,
    ativo: parsed.data.ativo,
    descricao:
      "Integração usada pelo login institucional do SECP para autenticação por LDAP/Active Directory.",
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
  };

  const integracao = existente
    ? await prisma.integracaoSistema.update({
        where: { id: existente.id },
        data: dadosIntegracao,
      })
    : await prisma.integracaoSistema.create({
        data: {
          id: orgaoId ? undefined : LDAP_ACTIVE_DIRECTORY_INTEGRACAO_ID,
          ...dadosIntegracao,
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
        orgaoId: integracao.orgaoId,
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

  revalidatePath("/integracoes");
  revalidatePath("/administracao/integracoes/ldap");

  return {
    sucesso: true,
    mensagem: "Parâmetros de LDAP/Active Directory atualizados com sucesso.",
  };
}
