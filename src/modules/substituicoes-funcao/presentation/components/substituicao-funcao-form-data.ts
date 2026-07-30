import {
  obterEscopoOrgaoDaSessao,
  whereOrgaoPermitido,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

async function materializarFuncoesAtuaisDosServidores(
  whereOrgao: ReturnType<typeof whereOrgaoPermitido>,
) {
  const servidoresComFuncao = await prisma.servidor.findMany({
    where: {
      ativo: true,
      orgao: whereOrgao,
      usuario: { ativo: true, tipo: "SERVIDOR" },
      funcaoAtualCategoriaSarh: { not: null },
      funcaoAtualCodigoSarh: { not: null },
    },
    select: {
      orgaoId: true,
      funcaoAtualGrupoSarh: true,
      funcaoAtualCategoriaSarh: true,
      funcaoAtualCodigoSarh: true,
      funcaoAtualDescricao: true,
    },
  });
  const referencias = new Map<
    string,
    {
      orgaoId: string;
      grupo: string | null;
      categoria: string;
      codigo: string;
      descricao: string;
      origem: "SARH";
      codigoExternoSarh: string;
      payloadSarh: {
        origem: string;
        grupo: string | null;
        categoria: string;
        codigo: string;
        descricao: string;
      };
      ultimaSincronizacaoSarh: Date;
    }
  >();

  for (const servidor of servidoresComFuncao) {
    const categoria = servidor.funcaoAtualCategoriaSarh?.trim();
    const codigo = servidor.funcaoAtualCodigoSarh?.trim();

    if (!categoria || !codigo) {
      continue;
    }

    const grupo = servidor.funcaoAtualGrupoSarh?.trim() || null;
    const descricao =
      servidor.funcaoAtualDescricao?.trim() || `${categoria} ${codigo}`.trim();
    const codigoExternoSarh = [
      "SERVIDOR_FUNCAO_ATUAL",
      servidor.orgaoId,
      grupo ?? "sem-grupo",
      categoria,
      codigo,
    ].join(":");

    referencias.set(codigoExternoSarh, {
      orgaoId: servidor.orgaoId,
      grupo,
      categoria,
      codigo,
      descricao,
      origem: "SARH",
      codigoExternoSarh,
      payloadSarh: {
        origem: "SERVIDOR_FUNCAO_ATUAL",
        grupo,
        categoria,
        codigo,
        descricao,
      },
      ultimaSincronizacaoSarh: new Date(),
    });
  }

  if (!referencias.size) {
    return;
  }

  await prisma.funcaoConfiancaReferencia.createMany({
    data: Array.from(referencias.values()),
    skipDuplicates: true,
  });
}

export async function carregarDadosFormularioSubstituicaoFuncao() {
  const escopo = await obterEscopoOrgaoDaSessao();
  const whereOrgao = whereOrgaoPermitido(escopo);
  await materializarFuncoesAtuaisDosServidores(whereOrgao);
  const [orgaos, unidades, servidores, funcoes] = await Promise.all([
    prisma.orgao.findMany({
      where: { ativo: true, ...whereOrgao },
      orderBy: [{ sigla: "asc" }],
      select: { id: true, sigla: true, nome: true },
    }),
    prisma.unidadeOrganizacional.findMany({
      where: { ativo: true, orgao: whereOrgao },
      orderBy: [{ sigla: "asc" }],
      select: { id: true, sigla: true, nome: true, orgao: { select: { sigla: true } } },
    }),
    prisma.servidor.findMany({
      where: {
        ativo: true,
        orgao: whereOrgao,
        usuario: { ativo: true, tipo: "SERVIDOR" },
      },
      orderBy: [{ matricula: "asc" }],
      select: {
        id: true,
        matricula: true,
        nomeFuncional: true,
        usuario: { select: { nome: true } },
        orgao: { select: { sigla: true } },
      },
    }),
    prisma.funcaoConfiancaReferencia.findMany({
      where: { ativo: true, OR: [{ orgao: whereOrgao }, { orgaoId: null }] },
      orderBy: [{ categoria: "asc" }, { codigo: "asc" }],
      select: { id: true, categoria: true, codigo: true, descricao: true },
    }),
  ]);

  return {
    orgaos: orgaos.map((orgao) => ({
      id: orgao.id,
      label: `${orgao.sigla} - ${orgao.nome}`,
    })),
    unidades: unidades.map((unidade) => ({
      id: unidade.id,
      label: `${unidade.orgao.sigla} / ${unidade.sigla} - ${unidade.nome}`,
    })),
    servidores: servidores.map((servidor) => ({
      id: servidor.id,
      label: `${servidor.orgao.sigla} / ${servidor.matricula} - ${
        servidor.nomeFuncional ?? servidor.usuario.nome
      }`,
    })),
    funcoes: funcoes.map((funcao) => ({
      id: funcao.id,
      label: `${funcao.categoria} ${funcao.codigo} - ${funcao.descricao}`,
    })),
  };
}
