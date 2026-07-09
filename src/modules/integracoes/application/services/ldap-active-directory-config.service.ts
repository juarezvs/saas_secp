import { prisma } from "@/shared/infrastructure/database/prisma";

export const LDAP_ACTIVE_DIRECTORY_INTEGRACAO_ID =
  "00000000-0000-0000-0000-000000000103";

export type ModoAutenticacaoLdapAd = "HTTP_AD_API" | "LDAP_BIND";

export type LdapActiveDirectoryConfig = {
  orgaoId: string | null;
  modoAutenticacao: ModoAutenticacaoLdapAd;
  nome: string;
  ativo: boolean;
  authUrl: string;
  ldapUrl: string;
  baseDn: string;
  dominio: string;
  bindDn: string;
  bindPassword: string;
  userDnPattern: string;
  searchFilter: string;
  timeoutMs: number;
};

const AD_AUTH_URL_PADRAO =
  "http://login.ad.integracao.am.trf1.gov.br/auth/login";

const LDAP_TIMEOUT_PADRAO_MS = 5000;

function lerString(configuracao: Record<string, unknown>, chave: string) {
  const valor = configuracao[chave];
  return typeof valor === "string" ? valor : "";
}

function lerNumero(configuracao: Record<string, unknown>, chave: string) {
  const valor = configuracao[chave];
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function normalizarConfiguracao(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

export function obterConfiguracaoLdapActiveDirectoryAmbiente(): LdapActiveDirectoryConfig {
  return {
    modoAutenticacao: process.env.LDAP_URL ? "LDAP_BIND" : "HTTP_AD_API",
    orgaoId: null,
    nome: "LDAP / Active Directory",
    ativo: true,
    authUrl: process.env.AD_AUTH_URL?.trim() || AD_AUTH_URL_PADRAO,
    ldapUrl: process.env.LDAP_URL?.trim() || "",
    baseDn: process.env.LDAP_BASE_DN?.trim() || "",
    dominio: process.env.LDAP_DOMAIN?.trim() || "",
    bindDn: process.env.LDAP_BIND_DN?.trim() || "",
    bindPassword: process.env.LDAP_BIND_PASSWORD ?? "",
    userDnPattern: "",
    searchFilter: "(sAMAccountName={{matricula}})",
    timeoutMs:
      Number(process.env.LDAP_TIMEOUT_MS ?? "") || LDAP_TIMEOUT_PADRAO_MS,
  };
}

async function montarConfiguracaoDaIntegracao(
  integracao: Awaited<ReturnType<typeof prisma.integracaoSistema.findFirst>>,
  fallback: LdapActiveDirectoryConfig,
): Promise<LdapActiveDirectoryConfig> {
  if (!integracao) {
    return fallback;
  }

  const configuracao = normalizarConfiguracao(integracao.configuracao);
  const modoConfigurado = lerString(configuracao, "modoAutenticacao");
  const modoAutenticacao: ModoAutenticacaoLdapAd =
    modoConfigurado === "LDAP_BIND" || modoConfigurado === "HTTP_AD_API"
      ? modoConfigurado
      : fallback.modoAutenticacao;

  return {
    orgaoId: integracao.orgaoId,
    modoAutenticacao,
    nome: integracao.nome || fallback.nome,
    ativo: integracao.ativo && integracao.status !== "INATIVA",
    authUrl:
      modoAutenticacao === "HTTP_AD_API"
        ? integracao.baseUrl ||
          lerString(configuracao, "authUrl") ||
          fallback.authUrl
        : lerString(configuracao, "authUrl") || fallback.authUrl,
    ldapUrl:
      modoAutenticacao === "LDAP_BIND"
        ? lerString(configuracao, "ldapUrl") ||
          integracao.baseUrl ||
          fallback.ldapUrl
        : lerString(configuracao, "ldapUrl") || fallback.ldapUrl,
    baseDn: lerString(configuracao, "baseDn") || fallback.baseDn,
    dominio: lerString(configuracao, "dominio") || fallback.dominio,
    bindDn: lerString(configuracao, "bindDn") || fallback.bindDn,
    bindPassword:
      lerString(configuracao, "bindPassword") || fallback.bindPassword,
    userDnPattern:
      lerString(configuracao, "userDnPattern") || fallback.userDnPattern,
    searchFilter:
      lerString(configuracao, "searchFilter") || fallback.searchFilter,
    timeoutMs:
      lerNumero(configuracao, "timeoutMs") ??
      fallback.timeoutMs ??
      LDAP_TIMEOUT_PADRAO_MS,
  };
}

export async function obterConfiguracaoLdapActiveDirectory(
  orgaoId?: string | null,
): Promise<LdapActiveDirectoryConfig> {
  const fallback = obterConfiguracaoLdapActiveDirectoryAmbiente();

  if (orgaoId) {
    const integracaoOrgao = await prisma.integracaoSistema.findFirst({
      where: { tipo: "LDAP", orgaoId },
      orderBy: { atualizadoEm: "desc" },
    });

    if (integracaoOrgao) {
      return montarConfiguracaoDaIntegracao(integracaoOrgao, fallback);
    }
  }

  const integracao = await prisma.integracaoSistema.findFirst({
    where: { tipo: "LDAP", orgaoId: null },
    orderBy: { atualizadoEm: "desc" },
  });

  return montarConfiguracaoDaIntegracao(integracao, fallback);
}

export async function obterOuCriarIntegracaoLdapActiveDirectory() {
  const ambiente = obterConfiguracaoLdapActiveDirectoryAmbiente();

  return prisma.integracaoSistema.upsert({
    where: { id: LDAP_ACTIVE_DIRECTORY_INTEGRACAO_ID },
    update: {},
    create: {
      id: LDAP_ACTIVE_DIRECTORY_INTEGRACAO_ID,
      orgaoId: null,
      nome: ambiente.nome,
      tipo: "LDAP",
      direcao: "ENTRADA",
      status:
        ambiente.authUrl || ambiente.ldapUrl ? "ATIVA" : "NAO_CONFIGURADA",
      baseUrl: ambiente.authUrl || null,
      ativo: true,
      descricao:
        "Integração usada pelo login institucional do SECP para autenticação por LDAP/Active Directory.",
      configuracao: {
        modoAutenticacao: ambiente.modoAutenticacao,
        authUrl: ambiente.authUrl,
        ldapUrl: ambiente.ldapUrl,
        baseDn: ambiente.baseDn,
        dominio: ambiente.dominio,
        bindDn: ambiente.bindDn,
        bindPassword: ambiente.bindPassword,
        userDnPattern: ambiente.userDnPattern,
        searchFilter: ambiente.searchFilter,
        timeoutMs: ambiente.timeoutMs,
      },
    },
  });
}
