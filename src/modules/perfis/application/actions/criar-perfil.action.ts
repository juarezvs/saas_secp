"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { perfilSchema, type PerfilFormState } from "../schemas/perfil.schema";

function extrairDadosPerfil(formData: FormData) {
  return {
    codigo: String(formData.get("codigo") ?? "").trim().toUpperCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    administrativo:
      formData.get("administrativo") === "on" ||
      formData.get("administrativo") === "true",
    excecao:
      formData.get("excecao") === "on" || formData.get("excecao") === "true",
    perfilDestinoExcecaoId: String(
      formData.get("perfilDestinoExcecaoId") ?? "",
    ),
    orgaoId: String(formData.get("orgaoId") ?? ""),
    permissoes: formData.getAll("permissoes").map(String),
  };
}

async function resolverOrgaoPerfil(params: {
  orgaoId: string;
  orgaoIdsPermitidos: string[];
  escopoGlobal: boolean;
}) {
  const orgaoId =
    params.orgaoId ||
    (!params.escopoGlobal && params.orgaoIdsPermitidos.length === 1
      ? params.orgaoIdsPermitidos[0]
      : "");

  if (!orgaoId) {
    return null;
  }

  if (!params.escopoGlobal && !params.orgaoIdsPermitidos.includes(orgaoId)) {
    throw new Error("A seccional informada não pertence ao escopo do perfil ativo.");
  }

  return prisma.orgao.findUnique({
    where: { id: orgaoId },
    select: { id: true, sigla: true },
  });
}

function aplicarPrefixoSeccional(codigo: string, sigla?: string) {
  const codigoNormalizado = codigo.trim().toUpperCase();
  const prefixo = `${(sigla ?? "SECP").toUpperCase()}-`;

  return codigoNormalizado.startsWith(prefixo)
    ? codigoNormalizado
    : `${prefixo}${codigoNormalizado}`;
}

export async function criarPerfilAction(
  _estadoAnterior: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "perfis:gerenciar:global",
    "perfis:gerenciar:seccional",
  ]);
  const dados = extrairDadosPerfil(formData);
  const parsed = perfilSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const orgao = await resolverOrgaoPerfil({
    orgaoId: parsed.data.orgaoId ?? "",
    orgaoIdsPermitidos: permissao.orgaoIds ?? [],
    escopoGlobal: permissao.perfilAtivoEscopoGlobal ?? false,
  }).catch((error: unknown) => {
    if (error instanceof Error) {
      return { erro: error.message } as const;
    }

    return { erro: "Não foi possível validar a seccional do perfil." } as const;
  });

  if (orgao && "erro" in orgao) {
    return {
      sucesso: false,
      mensagem: orgao.erro,
      campos: dados,
    };
  }

  const codigo = aplicarPrefixoSeccional(parsed.data.codigo, orgao?.sigla);
  const orgaosReplicacao =
    !orgao && (permissao.perfilAtivoEscopoGlobal ?? false)
      ? await prisma.orgao.findMany({
          where: { ativo: true },
          select: { id: true, sigla: true },
          orderBy: { sigla: "asc" },
        })
      : [];
  const codigosReplicacao = orgaosReplicacao.map((item) =>
    aplicarPrefixoSeccional(parsed.data.codigo, item.sigla),
  );
  const codigosParaValidar = [codigo, ...codigosReplicacao];
  const perfilExistente = await prisma.perfil.findFirst({
    where: {
      codigo: {
        in: codigosParaValidar,
      },
    },
    select: {
      codigo: true,
    },
  });

  if (perfilExistente) {
    return {
      sucesso: false,
      mensagem: `Já existe um perfil com o código ${perfilExistente.codigo}.`,
      erros: {
        codigo: [`Já existe um perfil com o código ${perfilExistente.codigo}.`],
      },
      campos: { ...dados, codigo },
    };
  }

  const perfil = await prisma.$transaction(async (tx) => {
    const novoPerfil = await tx.perfil.create({
      data: {
        codigo,
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
        ativo: parsed.data.ativo,
        administrativo: parsed.data.administrativo,
        excecao: parsed.data.excecao,
        orgaoId: orgao?.id ?? null,
        perfilDestinoExcecaoId: parsed.data.excecao
          ? parsed.data.perfilDestinoExcecaoId || null
          : null,
        sistema: false,
      },
    });

    const perfisReplicados = [];

    for (const orgaoReplicacao of orgaosReplicacao) {
      perfisReplicados.push(
        await tx.perfil.create({
          data: {
            codigo: aplicarPrefixoSeccional(
              parsed.data.codigo,
              orgaoReplicacao.sigla,
            ),
            nome: parsed.data.nome,
            descricao: parsed.data.descricao || null,
            ativo: parsed.data.ativo,
            administrativo: parsed.data.administrativo,
            excecao: parsed.data.excecao,
            orgaoId: orgaoReplicacao.id,
            perfilDestinoExcecaoId: parsed.data.excecao
              ? parsed.data.perfilDestinoExcecaoId || null
              : null,
            sistema: false,
          },
        }),
      );
    }

    const perfisCriados = [novoPerfil, ...perfisReplicados];

    if (parsed.data.permissoes.length > 0) {
      await tx.perfilPermissao.createMany({
        data: perfisCriados.flatMap((perfilCriado) =>
          parsed.data.permissoes.map((permissaoId) => ({
            perfilId: perfilCriado.id,
            permissaoId,
          })),
        ),
        skipDuplicates: true,
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Perfil",
        entidadeId: novoPerfil.id,
        acao: "PERFIL_CRIADO",
        dadosDepois: {
          id: novoPerfil.id,
          codigo: novoPerfil.codigo,
          nome: novoPerfil.nome,
          descricao: novoPerfil.descricao,
          ativo: novoPerfil.ativo,
          administrativo: novoPerfil.administrativo,
          excecao: novoPerfil.excecao,
          orgaoId: novoPerfil.orgaoId,
          perfilDestinoExcecaoId: novoPerfil.perfilDestinoExcecaoId,
          permissoes: parsed.data.permissoes,
          replicados: perfisReplicados.map((perfilReplicado) => ({
            id: perfilReplicado.id,
            codigo: perfilReplicado.codigo,
            orgaoId: perfilReplicado.orgaoId,
          })),
        },
      },
    });

    return novoPerfil;
  });

  revalidatePath("/perfis");
  revalidatePath(`/perfis/${perfil.id}`);

  redirect(`/perfis/${perfil.id}`);
}
