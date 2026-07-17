import { prisma } from "@/shared/infrastructure/database/prisma";
import type { StatusIntegracao } from "@/generated/prisma/client";
import type { SarhOracleClientOptions } from "../../infrastructure/oracle/sarh-oracle-client";

export type SarhOracleConfig = SarhOracleClientOptions & {
  orgaoId: string | null;
  nome: string;
  ativo: boolean;
  status: StatusIntegracao;
  possuiPassword: boolean;
};

const SARH_GLOBAL_INTEGRACAO_ID = "00000000-0000-0000-0000-000000000101";

function normalizarConfiguracao(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function lerString(configuracao: Record<string, unknown>, chave: string) {
  const valor = configuracao[chave];
  return typeof valor === "string" ? valor : "";
}

function pareceCaminhoWindows(valor: string) {
  return /^[a-zA-Z]:[\\/]/.test(valor);
}

function resolverOracleHome(configurado?: string, fallback?: string) {
  if (!configurado) return fallback ?? "";

  if (process.platform !== "win32" && pareceCaminhoWindows(configurado)) {
    return fallback ?? "";
  }

  return configurado;
}

function configAmbiente(): SarhOracleConfig {
  const username = process.env.SARH_DB_USERNAME ?? process.env.DB_USERNAME ?? "";
  const password = process.env.SARH_DB_PASSWORD ?? process.env.DB_PASSWORD ?? "";
  const connectString =
    process.env.SARH_DB_TNS_ALIAS ?? process.env.DB_TNS_ALIAS ?? "";
  const oracleHome =
    process.env.SARH_ORACLE_HOME ?? process.env.ORACLE_HOME ?? "";
  const siglaLocalidade =
    process.env.SARH_SIGLA_LOCALIDADE ?? process.env.SIGLA_LOCALIDADE ?? "AM";
  const ativo = Boolean(username && password && connectString);

  return {
    orgaoId: null,
    nome: "SARH",
    ativo,
    status: ativo ? "ATIVA" : "NAO_CONFIGURADA",
    username,
    password,
    connectString,
    oracleHome,
    siglaLocalidade,
    possuiPassword: Boolean(password),
  };
}

function montarConfig(
  integracao: Awaited<ReturnType<typeof prisma.integracaoSistema.findFirst>>,
  fallback: SarhOracleConfig,
): SarhOracleConfig {
  if (!integracao) {
    return fallback;
  }

  const configuracao = normalizarConfiguracao(integracao.configuracao);
  const password = lerString(configuracao, "password") || fallback.password;

  return {
    orgaoId: integracao.orgaoId,
    nome: integracao.nome || fallback.nome,
    ativo: integracao.ativo && integracao.status !== "INATIVA",
    status: integracao.status,
    username: lerString(configuracao, "username") || fallback.username,
    password,
    connectString:
      lerString(configuracao, "connectString") ||
      integracao.baseUrl?.replace(/^oracle:\/\//, "") ||
      fallback.connectString,
    oracleHome: resolverOracleHome(
      lerString(configuracao, "oracleHome"),
      fallback.oracleHome,
    ),
    siglaLocalidade:
      lerString(configuracao, "siglaLocalidade") || fallback.siglaLocalidade,
    possuiPassword: Boolean(password),
  };
}

export async function obterConfiguracaoSarhOracle(
  orgaoId?: string | null,
): Promise<SarhOracleConfig> {
  const fallback = configAmbiente();

  if (orgaoId) {
    const integracaoOrgao = await prisma.integracaoSistema.findFirst({
      where: { tipo: "SARH", orgaoId },
      orderBy: { atualizadoEm: "desc" },
    });

    return montarConfig(integracaoOrgao, {
      ...fallback,
      orgaoId,
      ativo: false,
      status: "NAO_CONFIGURADA",
      username: "",
      password: "",
      connectString: "",
      possuiPassword: false,
    });
  }

  const integracaoGlobal = await prisma.integracaoSistema.findFirst({
    where: { tipo: "SARH", orgaoId: null },
    orderBy: { atualizadoEm: "desc" },
  });

  return montarConfig(integracaoGlobal, fallback);
}

export async function obterIntegracaoSarhConfigurada(
  orgaoId?: string | null,
) {
  const config = await obterConfiguracaoSarhOracle(orgaoId);

  if (
    !config.ativo ||
    !config.username ||
    !config.password ||
    !config.connectString
  ) {
    throw new Error(
      orgaoId
        ? "Configure a conexao Oracle do SARH para a seccional antes de sincronizar."
        : "Configure a conexao Oracle do SARH antes de sincronizar.",
    );
  }

  let integracao = await prisma.integracaoSistema.findFirst({
    where: { tipo: "SARH", orgaoId: orgaoId ?? null },
    orderBy: { atualizadoEm: "desc" },
  });

  if (!integracao && !orgaoId) {
    integracao = await upsertConfiguracaoSarhOracle({
      orgaoId: null,
      nome: config.nome,
      ativo: config.ativo,
      username: config.username ?? "",
      password: config.password ?? "",
      connectString: config.connectString ?? "",
      oracleHome: config.oracleHome,
      siglaLocalidade: config.siglaLocalidade ?? "AM",
    });
  }

  if (!integracao) {
    throw new Error("Integracao SARH nao configurada.");
  }

  return { integracao, config };
}

export async function upsertConfiguracaoSarhOracle(params: {
  orgaoId?: string | null;
  nome: string;
  ativo: boolean;
  username: string;
  password: string;
  connectString: string;
  oracleHome?: string;
  siglaLocalidade: string;
}) {
  const orgaoId = params.orgaoId ?? null;
  const status: StatusIntegracao =
    params.ativo && params.username && params.password && params.connectString
      ? "ATIVA"
      : params.ativo
        ? "NAO_CONFIGURADA"
        : "INATIVA";
  const existente = orgaoId
    ? await prisma.integracaoSistema.findFirst({
        where: { tipo: "SARH", orgaoId },
        select: { id: true },
      })
    : await prisma.integracaoSistema.findUnique({
        where: { id: SARH_GLOBAL_INTEGRACAO_ID },
        select: { id: true },
      });

  const data = {
    orgaoId,
    nome: params.nome,
    tipo: "SARH" as const,
    direcao: "ENTRADA" as const,
    status,
    baseUrl: params.connectString ? `oracle://${params.connectString}` : null,
    ativo: params.ativo,
    descricao:
      "Integracao para sincronizar orgaos, lotacoes, cargos, servidores, chefias e afastamentos a partir do SARH.",
    configuracao: {
      provider: "oracle",
      username: params.username,
      password: params.password,
      connectString: params.connectString,
      oracleHome: params.oracleHome || "",
      siglaLocalidade: params.siglaLocalidade,
    },
  };

  return existente
    ? prisma.integracaoSistema.update({
        where: { id: existente.id },
        data,
      })
    : prisma.integracaoSistema.create({
        data: {
          id: orgaoId ? undefined : SARH_GLOBAL_INTEGRACAO_ID,
          ...data,
        },
      });
}
