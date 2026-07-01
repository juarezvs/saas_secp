"use server";

import { revalidatePath } from "next/cache";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  sarhOracleSchema,
  type SarhOracleFormState,
} from "@/modules/integracoes/application/schemas/integracao.schema";
import {
  obterConfiguracaoSarhOracle,
  upsertConfiguracaoSarhOracle,
} from "../../application/services/sarh-oracle-config.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

function extrairDados(formData: FormData) {
  return {
    orgaoId: String(formData.get("orgaoId") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    username: String(formData.get("username") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    connectString: String(formData.get("connectString") ?? "").trim(),
    oracleHome: String(formData.get("oracleHome") ?? "").trim(),
    siglaLocalidade: String(formData.get("siglaLocalidade") ?? "").trim(),
  };
}

export async function atualizarSarhOracleAction(
  _estadoAnterior: SarhOracleFormState,
  formData: FormData,
): Promise<SarhOracleFormState> {
  const permissao = await exigirPermissao("integracoes-sarh:configurar:global");
  const dados = extrairDados(formData);
  const parsed = sarhOracleSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os parâmetros Oracle do SARH.",
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

  const atual = await obterConfiguracaoSarhOracle(orgaoId);
  const password =
    parsed.data.password && parsed.data.password.trim().length > 0
      ? parsed.data.password
      : (atual.password ?? "");

  if (!password) {
    return {
      sucesso: false,
      mensagem: "Informe a senha Oracle do SARH.",
      erros: { password: ["Informe a senha Oracle do SARH."] },
      campos: dados,
    };
  }

  const integracao = await upsertConfiguracaoSarhOracle({
    orgaoId,
    nome: parsed.data.nome,
    ativo: parsed.data.ativo,
    username: parsed.data.username,
    password,
    connectString: parsed.data.connectString,
    oracleHome: parsed.data.oracleHome,
    siglaLocalidade: parsed.data.siglaLocalidade,
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
      entidade: "IntegracaoSistema",
      entidadeId: integracao.id,
      acao: "SARH_ORACLE_CONFIGURADO",
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
          password: password ? "[REDACTED]" : "",
        },
      },
    },
  });

  revalidatePath("/administracao/integracoes/sarh");
  revalidatePath("/integracoes");

  return {
    sucesso: true,
    mensagem: "Conexão Oracle do SARH atualizada com sucesso.",
  };
}
