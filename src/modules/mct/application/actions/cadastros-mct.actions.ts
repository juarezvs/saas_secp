"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { condicaoMctSchema } from "../schemas/mct-policy.schema";

const PATH = "/cadastros-auxiliares/mct";
const consultar = [
  "mct-rubricas:consultar:seccional",
  "mct-rubricas:consultar:global",
  "mct-politicas:consultar:seccional",
  "mct-politicas:consultar:global",
  "mct-regras:consultar:seccional",
  "mct-regras:consultar:global",
];
const gerenciar = [
  "mct-rubricas:gerenciar:seccional",
  "mct-rubricas:gerenciar:global",
  "mct-politicas:gerenciar:seccional",
  "mct-politicas:gerenciar:global",
  "mct-regras:gerenciar:seccional",
  "mct-regras:gerenciar:global",
];

function hash(valor: unknown) {
  return createHash("sha256").update(JSON.stringify(valor)).digest("hex");
}

function json(valor: unknown) {
  return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
}

async function contexto(orgaoInformado: string, permissoes = gerenciar) {
  const [acesso, escopo] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar(permissoes),
    obterEscopoOrgaoDaSessao(),
  ]);
  const orgaoId = escopo.global ? orgaoInformado : escopo.orgaoIds[0];
  if (!orgaoId || (!escopo.global && !escopo.orgaoIds.includes(orgaoId))) {
    throw new Error("Órgão fora do escopo do perfil ativo.");
  }
  return { orgaoId, usuarioId: acesso.usuarioId };
}

const rubricaSchema = z.object({
  orgaoId: z.string().uuid(),
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}-[A-Z0-9-]+$/),
  nome: z.string().trim().min(3).max(160),
  descricao: z.string().trim().min(3),
  dimensao: z.enum([
    "TEMPORAL",
    "JURIDICA_ADMINISTRATIVA",
    "DESTINACAO",
    "INCIDENCIA",
  ]),
  natureza: z.string().trim().min(2).max(80),
  unidade: z.enum(["MINUTO", "QUANTIDADE", "BOOLEANO"]),
  vigenciaInicio: z.coerce.date(),
  fundamentoNormativo: z.string().trim().max(2000).optional(),
  prioridade: z.coerce.number().int().default(100),
  exigeAutorizacao: z.boolean(),
  exigeHomologacao: z.boolean(),
  efeitoBancoHoras: z.enum(["NENHUM", "CREDITO", "DEBITO", "COMPENSACAO"]),
});

const naturezaRubricaSchema = z.object({
  orgaoId: z.string().uuid(),
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]+$/)
    .max(80),
  nome: z.string().trim().min(2).max(160),
  descricao: z.string().trim().max(1000).optional(),
});

export async function criarNaturezaRubricaMctAction(formData: FormData) {
  const dados = naturezaRubricaSchema.parse({
    orgaoId: formData.get("orgaoId"),
    codigo: formData.get("codigo"),
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || undefined,
  });
  const { orgaoId } = await contexto(dados.orgaoId, [
    "mct-rubricas:gerenciar:seccional",
    "mct-rubricas:gerenciar:global",
  ]);
  await prisma.mctNaturezaRubrica.upsert({
    where: { orgaoId_codigo: { orgaoId, codigo: dados.codigo } },
    update: {
      nome: dados.nome,
      descricao: dados.descricao || null,
      ativo: true,
    },
    create: {
      orgaoId,
      codigo: dados.codigo,
      nome: dados.nome,
      descricao: dados.descricao || null,
    },
  });
  revalidatePath(PATH);
}

export async function criarVersaoRubricaMctAction(formData: FormData) {
  const dados = rubricaSchema.parse({
    orgaoId: formData.get("orgaoId"),
    codigo: formData.get("codigo"),
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    dimensao: formData.get("dimensao"),
    natureza: formData.get("natureza"),
    unidade: formData.get("unidade"),
    vigenciaInicio: formData.get("vigenciaInicio"),
    fundamentoNormativo: formData.get("fundamentoNormativo") || undefined,
    prioridade: formData.get("prioridade") || 100,
    exigeAutorizacao: formData.get("exigeAutorizacao") === "on",
    exigeHomologacao: formData.get("exigeHomologacao") === "on",
    efeitoBancoHoras: formData.get("efeitoBancoHoras"),
  });
  const { orgaoId, usuarioId } = await contexto(dados.orgaoId, [
    "mct-rubricas:gerenciar:seccional",
    "mct-rubricas:gerenciar:global",
  ]);
  const natureza = await prisma.mctNaturezaRubrica.findFirst({
    where: { orgaoId, codigo: dados.natureza, ativo: true },
    select: { id: true },
  });
  if (!natureza) throw new Error("Selecione uma natureza de rubrica ativa.");
  const ultima = await prisma.mctRubricaVersao.findFirst({
    where: { orgaoId, codigo: dados.codigo },
    orderBy: { versao: "desc" },
  });
  const definicao = {
    prioridade: dados.prioridade,
    exigeAutorizacao: dados.exigeAutorizacao,
    exigeHomologacao: dados.exigeHomologacao,
    efeitoBancoHoras: dados.efeitoBancoHoras,
    elegivelFolha: false,
    grupoExclusividade: null,
  };
  await prisma.mctRubricaVersao.create({
    data: {
      orgaoId,
      codigo: dados.codigo,
      nome: dados.nome,
      descricao: dados.descricao,
      dimensao: dados.dimensao,
      natureza: dados.natureza,
      unidade: dados.unidade,
      versao: (ultima?.versao ?? 0) + 1,
      vigenciaInicio: dados.vigenciaInicio,
      fundamentoNormativo: dados.fundamentoNormativo || null,
      definicao,
      hashConteudo: hash({ ...dados, definicao }),
      criadaPorUsuarioId: usuarioId,
    },
  });
  revalidatePath(PATH);
}

const politicaSchema = z.object({
  orgaoId: z.string().uuid(),
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]+$/),
  nome: z.string().trim().min(3).max(160),
  descricao: z.string().trim().max(2000).optional(),
  vigenciaInicio: z.coerce.date(),
  cargaExigivelMinutos: z.coerce.number().int().min(0),
  intervaloMinimoMinutos: z.coerce.number().int().min(0),
  intervaloMaximoMinutos: z.coerce.number().int().min(0),
  flexibilidadeEntradaMinutos: z.coerce.number().int().min(0),
  flexibilidadeSaidaMinutos: z.coerce.number().int().min(0),
  permiteCompensacaoNoDia: z.boolean(),
  fundamentoNormativo: z.string().trim().max(2000).optional(),
});

export async function criarVersaoPoliticaMctAction(formData: FormData) {
  const dados = politicaSchema.parse({
    orgaoId: formData.get("orgaoId"),
    codigo: formData.get("codigo"),
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || undefined,
    vigenciaInicio: formData.get("vigenciaInicio"),
    cargaExigivelMinutos: formData.get("cargaExigivelMinutos"),
    intervaloMinimoMinutos: formData.get("intervaloMinimoMinutos") || 0,
    intervaloMaximoMinutos: formData.get("intervaloMaximoMinutos") || 0,
    flexibilidadeEntradaMinutos:
      formData.get("flexibilidadeEntradaMinutos") || 0,
    flexibilidadeSaidaMinutos: formData.get("flexibilidadeSaidaMinutos") || 0,
    permiteCompensacaoNoDia: formData.get("permiteCompensacaoNoDia") === "on",
    fundamentoNormativo: formData.get("fundamentoNormativo") || undefined,
  });
  const { orgaoId, usuarioId } = await contexto(dados.orgaoId, [
    "mct-politicas:gerenciar:seccional",
    "mct-politicas:gerenciar:global",
  ]);
  const ultima = await prisma.mctPoliticaVersao.findFirst({
    where: { orgaoId, codigo: dados.codigo },
    orderBy: { versao: "desc" },
  });
  const configuracao = {
    cargaExigivelMinutos: dados.cargaExigivelMinutos,
    intervaloMinimoMinutos: dados.intervaloMinimoMinutos,
    intervaloMaximoMinutos: dados.intervaloMaximoMinutos,
    flexibilidadeEntradaMinutos: dados.flexibilidadeEntradaMinutos,
    flexibilidadeSaidaMinutos: dados.flexibilidadeSaidaMinutos,
    permiteCompensacaoNoDia: dados.permiteCompensacaoNoDia,
  };
  await prisma.mctPoliticaVersao.create({
    data: {
      orgaoId,
      codigo: dados.codigo,
      nome: dados.nome,
      descricao: dados.descricao || null,
      versao: (ultima?.versao ?? 0) + 1,
      vigenciaInicio: dados.vigenciaInicio,
      configuracao,
      regras: [],
      fundamentoNormativo: dados.fundamentoNormativo || null,
      hashConteudo: hash({ ...dados, configuracao }),
      criadaPorUsuarioId: usuarioId,
    },
  });
  revalidatePath(PATH);
}

const regraSchema = z.object({
  orgaoId: z.string().uuid(),
  politicaVersaoId: z.string().uuid(),
  rubricaVersaoId: z.string().uuid(),
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_-]+$/),
  nome: z.string().trim().min(3).max(160),
  prioridade: z.coerce.number().int(),
  campo: z.string().trim().min(1),
  operador: z.enum(["EQ", "NE", "GT", "GTE", "LT", "LTE"]),
  valor: z.string().trim().min(1),
  escopoTemporal: z.string().trim().min(1).max(80),
  estrategia: z.enum(["CONSTANTE", "CAMPO"]),
  quantidade: z.string().trim().min(1),
  vigenciaInicio: z.coerce.date(),
  fundamentoNormativo: z.string().trim().max(2000).optional(),
});

export async function criarVersaoRegraMctAction(formData: FormData) {
  const dados = regraSchema.parse(Object.fromEntries(formData));
  const { orgaoId, usuarioId } = await contexto(dados.orgaoId, [
    "mct-regras:gerenciar:seccional",
    "mct-regras:gerenciar:global",
  ]);
  const [politica, rubrica] = await Promise.all([
    prisma.mctPoliticaVersao.findFirstOrThrow({
      where: { id: dados.politicaVersaoId, orgaoId },
    }),
    prisma.mctRubricaVersao.findFirstOrThrow({
      where: {
        id: dados.rubricaVersaoId,
        OR: [{ orgaoId }, { orgaoId: null }],
      },
    }),
  ]);
  const valorNumerico = Number(dados.valor);
  const condicao = condicaoMctSchema.parse({
    campo: dados.campo,
    operador: dados.operador,
    valor: Number.isFinite(valorNumerico) ? valorNumerico : dados.valor,
  });
  const ultima = await prisma.mctRegraVersao.findFirst({
    where: { orgaoId, codigo: dados.codigo },
    orderBy: { versao: "desc" },
  });
  const regra = await prisma.mctRegraVersao.create({
    data: {
      orgaoId,
      politicaVersaoId: politica.id,
      codigo: dados.codigo,
      nome: dados.nome,
      versao: (ultima?.versao ?? 0) + 1,
      prioridade: dados.prioridade,
      condicao: json(condicao),
      vigenciaInicio: dados.vigenciaInicio,
      fundamentoNormativo: dados.fundamentoNormativo || null,
      hashConteudo: hash(dados),
      criadaPorUsuarioId: usuarioId,
    },
  });
  await prisma.mctRegraEfeito.create({
    data: {
      regraVersaoId: regra.id,
      rubricaVersaoId: rubrica.id,
      escopoTemporal: dados.escopoTemporal,
      estrategia: dados.estrategia,
      quantidadeMinutos:
        dados.estrategia === "CONSTANTE" ? Number(dados.quantidade) : null,
      campoQuantidade: dados.estrategia === "CAMPO" ? dados.quantidade : null,
    },
  });
  revalidatePath(PATH);
}

export async function alterarEstadoCadastroMctAction(formData: FormData) {
  const tipo = z
    .enum(["rubrica", "politica", "regra"])
    .parse(formData.get("tipo"));
  const id = z.string().uuid().parse(formData.get("id"));
  const estado = z.enum(["PUBLICADA", "INATIVA"]).parse(formData.get("estado"));
  const orgaoId = z.string().uuid().parse(formData.get("orgaoId"));
  const { orgaoId: permitido, usuarioId } = await contexto(orgaoId, [
    `mct-${tipo}s:gerenciar:seccional`,
    `mct-${tipo}s:gerenciar:global`,
  ]);
  const data = {
    estado,
    publicadaEm: estado === "PUBLICADA" ? new Date() : undefined,
    publicadaPorUsuarioId: estado === "PUBLICADA" ? usuarioId : undefined,
  };
  await prisma.$transaction(async (tx) => {
    if (tipo === "rubrica") {
      const atual = await tx.mctRubricaVersao.findFirstOrThrow({
        where: { id, orgaoId: permitido },
      });
      if (estado === "PUBLICADA")
        await tx.mctRubricaVersao.updateMany({
          where: {
            orgaoId: permitido,
            codigo: atual.codigo,
            estado: "PUBLICADA",
            id: { not: id },
          },
          data: { estado: "INATIVA" },
        });
      await tx.mctRubricaVersao.update({ where: { id }, data });
    }
    if (tipo === "politica") {
      const atual = await tx.mctPoliticaVersao.findFirstOrThrow({
        where: { id, orgaoId: permitido },
      });
      if (estado === "PUBLICADA")
        await tx.mctPoliticaVersao.updateMany({
          where: {
            orgaoId: permitido,
            codigo: atual.codigo,
            estado: "PUBLICADA",
            id: { not: id },
          },
          data: { estado: "INATIVA" },
        });
      await tx.mctPoliticaVersao.update({ where: { id }, data });
    }
    if (tipo === "regra") {
      const atual = await tx.mctRegraVersao.findFirstOrThrow({
        where: { id, orgaoId: permitido },
      });
      if (estado === "PUBLICADA")
        await tx.mctRegraVersao.updateMany({
          where: {
            orgaoId: permitido,
            codigo: atual.codigo,
            estado: "PUBLICADA",
            id: { not: id },
          },
          data: { estado: "INATIVA" },
        });
      await tx.mctRegraVersao.update({ where: { id }, data });
    }
    await tx.auditoriaEvento.create({
      data: {
        usuarioId,
        entidade: `MCT_${tipo.toUpperCase()}`,
        entidadeId: id,
        acao: estado === "PUBLICADA" ? "PUBLICAR" : "INATIVAR",
        dadosDepois: { estado, orgaoId: permitido },
      },
    });
  });
  revalidatePath(PATH);
}

export async function exigirConsultaCadastrosMct() {
  return exigirUmaDasPermissoesOuRedirecionar(consultar);
}
