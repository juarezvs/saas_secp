"use server";

import { redirect } from "next/navigation";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { autenticarNoActiveDirectory } from "@/modules/auth/infrastructure/active-directory/active-directory-auth.service";
import { obterConfiguracaoSarhOracle } from "@/modules/integracoes/sarh/application/services/sarh-oracle-config.service";
import { SarhOracleClient } from "@/modules/integracoes/sarh/infrastructure/oracle/sarh-oracle-client";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { obterConfiguracaoLdapActiveDirectory } from "../services/ldap-active-directory-config.service";
import { consultarSaudeRelogioPontoService } from "../services/relogios-ponto/relogio-ponto-operacoes.service";

type TipoTesteIntegracao = "SARH" | "LDAP" | "EQUIPAMENTO_BIOMETRICO";

function destino(params: {
  orgaoId: string | null;
  resultado: "ok" | "erro";
  tipo?: TipoTesteIntegracao | null;
  erro?: string | null;
}) {
  const query = new URLSearchParams();

  if (params.orgaoId) {
    query.set("orgaoId", params.orgaoId);
  }

  query.set("teste", params.resultado);

  if (params.tipo) {
    query.set("tipoTeste", params.tipo);
  }

  if (params.erro) {
    query.set("erroTeste", params.erro);
  }

  return `/administracao/integracoes?${query.toString()}`;
}

function mensagemErro(error: unknown) {
  return error instanceof Error ? error.message : "Falha inesperada no teste.";
}

function mascararSegredos(
  mensagem: string,
  segredos: Array<string | null | undefined>,
) {
  let texto = mensagem;

  for (const segredo of segredos) {
    if (!segredo || segredo.length < 3) {
      continue;
    }

    texto = texto.replaceAll(segredo, "[REDACTED]");
  }

  return texto;
}

async function validarEscopo(orgaoId: string | null) {
  const escopo = await obterEscopoOrgaoDaSessao();

  if (!orgaoId) {
    throw new Error("Selecione uma seccional antes de testar a integracao.");
  }

  if (!escopo.global && !escopo.orgaoIds.includes(orgaoId)) {
    throw new Error("Seccional fora do escopo do perfil ativo.");
  }
}

async function atualizarResultado(params: {
  tipo: TipoTesteIntegracao;
  orgaoId: string;
  sucesso: boolean;
  erro?: string;
}) {
  const integracao = await prisma.integracaoSistema.findFirst({
    where: {
      tipo: params.tipo,
      orgaoId: params.orgaoId,
    },
    select: { id: true },
    orderBy: { atualizadoEm: "desc" },
  });

  if (!integracao) {
    return;
  }

  await prisma.integracaoSistema.update({
    where: { id: integracao.id },
    data: params.sucesso
      ? {
          status: "ATIVA",
          ultimoSucessoEm: new Date(),
          ultimoErro: null,
        }
      : {
          status: "ERRO",
          ultimoErroEm: new Date(),
          ultimoErro: params.erro ?? "Falha no teste operacional.",
        },
  });
}

async function testarSarh(orgaoId: string) {
  const config = await obterConfiguracaoSarhOracle(orgaoId);

  if (
    !config.ativo ||
    !config.username ||
    !config.password ||
    !config.connectString
  ) {
    throw new Error("Conexao Oracle do SARH incompleta ou inativa.");
  }

  try {
    await new SarhOracleClient({
      username: config.username,
      password: config.password,
      connectString: config.connectString,
      oracleHome: config.oracleHome,
      siglaLocalidade: config.siglaLocalidade,
    }).testarConexao();
  } catch (error) {
    throw new Error(
      mascararSegredos(mensagemErro(error), [
        config.username,
        config.password,
        config.connectString,
      ]),
    );
  }
}

async function testarLdap(orgaoId: string, matricula: string, senha: string) {
  const config = await obterConfiguracaoLdapActiveDirectory(orgaoId);

  if (!config.ativo) {
    throw new Error("Integracao LDAP/AD inativa.");
  }

  if (!matricula || !senha) {
    throw new Error(
      "Informe matricula e senha para testar o Active Directory.",
    );
  }

  const autenticado = await autenticarNoActiveDirectory(
    matricula,
    senha,
    orgaoId,
  );

  if (!autenticado) {
    throw new Error("Credenciais nao validadas pelo Active Directory.");
  }
}

async function testarRelogio(orgaoId: string) {
  const equipamento = await prisma.equipamentoBiometrico.findFirst({
    where: {
      ativo: true,
      OR: [{ orgaoId }, { unidade: { orgaoId } }],
    },
    select: { id: true },
    orderBy: { nome: "asc" },
  });

  if (!equipamento) {
    throw new Error("Nenhum relogio ativo vinculado a seccional.");
  }

  const resultado = await consultarSaudeRelogioPontoService(equipamento.id);

  if (resultado.status !== "ONLINE") {
    throw new Error(resultado.mensagem || "Relogio respondeu como offline.");
  }
}

export async function testarIntegracaoSeccionalAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:gerenciar:global",
    "integracoes:gerenciar:seccional",
    "integracoes-sarh:configurar:global",
  ]);

  const tipo = String(formData.get("tipo") ?? "") as TipoTesteIntegracao;
  const orgaoId = String(formData.get("orgaoId") ?? "").trim() || null;
  const matricula = String(formData.get("matricula") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  let resultado: "ok" | "erro" = "ok";
  let erroTeste: string | null = null;

  try {
    await validarEscopo(orgaoId);

    if (!orgaoId) {
      throw new Error("Selecione uma seccional antes de testar a integracao.");
    }

    if (tipo === "SARH") {
      await testarSarh(orgaoId);
    } else if (tipo === "LDAP") {
      await testarLdap(orgaoId, matricula, senha);
    } else if (tipo === "EQUIPAMENTO_BIOMETRICO") {
      await testarRelogio(orgaoId);
    } else {
      throw new Error("Tipo de integracao invalido.");
    }

    await atualizarResultado({ tipo, orgaoId, sucesso: true });
  } catch (error) {
    resultado = "erro";
    erroTeste = mensagemErro(error).slice(0, 1500);

    if (orgaoId && ["SARH", "LDAP", "EQUIPAMENTO_BIOMETRICO"].includes(tipo)) {
      await atualizarResultado({
        tipo,
        orgaoId,
        sucesso: false,
        erro: erroTeste,
      });
    }
  }

  redirect(
    destino({
      orgaoId,
      resultado,
      tipo: ["SARH", "LDAP", "EQUIPAMENTO_BIOMETRICO"].includes(tipo)
        ? tipo
        : null,
      erro: erroTeste,
    }),
  );
}
