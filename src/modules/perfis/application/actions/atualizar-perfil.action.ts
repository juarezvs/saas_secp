"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { invalidarCacheUsuarioAuthPorMatricula } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  buscarPerfilPorId,
  codigoPerfilExiste,
} from "../../infrastructure/repositories/perfil.repository";
import { perfilSchema, type PerfilFormState } from "../schemas/perfil.schema";
import { calcularExcecoesPermissoesSeccionais } from "../services/permissoes-perfil-seccional.service";

function extrairDadosPerfil(formData: FormData) {
  return {
    codigo: String(formData.get("codigo") ?? "")
      .trim()
      .toUpperCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    administrativo:
      formData.get("administrativo") === "on" ||
      formData.get("administrativo") === "true",
    excecao:
      formData.get("excecao") === "on" || formData.get("excecao") === "true",
    global:
      formData.get("global") === "on" || formData.get("global") === "true",
    perfilDestinoExcecaoId: String(
      formData.get("perfilDestinoExcecaoId") ?? "",
    ),
    orgaoId: String(formData.get("orgaoId") ?? ""),
    permissoes: formData.getAll("permissoes").map(String),
    orgaoEscopoPermissoes: String(formData.get("orgaoEscopoPermissoes") ?? ""),
  };
}

async function resolverOrgaoPerfil(params: {
  orgaoId: string;
  orgaoIdsPermitidos: string[];
  escopoGlobal: boolean;
  orgaoIdAtual?: string | null;
}) {
  const orgaoId =
    params.orgaoId ||
    params.orgaoIdAtual ||
    (!params.escopoGlobal && params.orgaoIdsPermitidos.length === 1
      ? params.orgaoIdsPermitidos[0]
      : "");

  if (!orgaoId) {
    return null;
  }

  if (!params.escopoGlobal && !params.orgaoIdsPermitidos.includes(orgaoId)) {
    throw new Error(
      "A seccional informada não pertence ao escopo do perfil ativo.",
    );
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

async function invalidarCacheUsuariosDoPerfil(perfilId: string) {
  const vinculos = await prisma.usuarioPerfil.findMany({
    where: { perfilId, ativo: true },
    select: { usuario: { select: { matricula: true } } },
  });

  await Promise.all(
    vinculos.map(({ usuario }) =>
      invalidarCacheUsuarioAuthPorMatricula(usuario.matricula),
    ),
  );
}

export async function atualizarPerfilAction(
  perfilId: string,
  _estadoAnterior: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "perfis:gerenciar:global",
    "perfis:gerenciar:seccional",
  ]);
  const perfilAtual = await buscarPerfilPorId(perfilId);

  if (!perfilAtual) {
    return {
      sucesso: false,
      mensagem: "Perfil não encontrado.",
    };
  }

  const escopoGlobal = permissao.perfilAtivoEscopoGlobal ?? false;
  const orgaoIdsPermitidos = permissao.orgaoIds ?? [];

  if (
    !escopoGlobal &&
    !perfilAtual.global &&
    (!perfilAtual.orgaoId || !orgaoIdsPermitidos.includes(perfilAtual.orgaoId))
  ) {
    return {
      sucesso: false,
      mensagem: "Este perfil não pertence ao escopo do perfil ativo.",
    };
  }

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

  if (!escopoGlobal && perfilAtual.global) {
    const orgaoId = dados.orgaoEscopoPermissoes;

    if (!orgaoId || !orgaoIdsPermitidos.includes(orgaoId)) {
      return {
        sucesso: false,
        mensagem: "Não foi possível determinar a seccional desta configuração.",
        campos: dados,
      };
    }

    const excecoes = calcularExcecoesPermissoesSeccionais(
      perfilAtual.permissoes.map((item) => item.permissaoId),
      parsed.data.permissoes,
    );

    await prisma.$transaction(async (tx) => {
      await tx.perfilPermissaoOrgao.deleteMany({
        where: { perfilId, orgaoId },
      });

      if (excecoes.length) {
        await tx.perfilPermissaoOrgao.createMany({
          data: excecoes.map((item) => ({
            perfilId,
            orgaoId,
            permissaoId: item.permissaoId,
            permitida: item.permitida,
          })),
        });
      }

      await tx.auditoriaEvento.create({
        data: {
          usuarioId: permissao.usuarioId,
          entidade: "PerfilPermissaoOrgao",
          entidadeId: perfilId,
          acao: "PERMISSOES_PERFIL_SECCIONAL_ATUALIZADAS",
          dadosAntes: {
            orgaoId,
            excecoes: perfilAtual.permissoesSeccionais
              .filter((item) => item.orgaoId === orgaoId)
              .map((item) => ({
                permissaoId: item.permissaoId,
                permitida: item.permitida,
              })),
          },
          dadosDepois: { orgaoId, excecoes },
        },
      });
    });

    await invalidarCacheUsuariosDoPerfil(perfilId);
    revalidatePath("/perfis");
    revalidatePath(`/perfis/${perfilId}`);
    redirect(`/perfis/${perfilId}`);
  }

  const orgao = perfilAtual.sistema
    ? null
    : await resolverOrgaoPerfil({
        orgaoId: parsed.data.orgaoId ?? "",
        orgaoIdAtual: perfilAtual.orgaoId,
        orgaoIdsPermitidos,
        escopoGlobal,
      }).catch((error: unknown) => {
        if (error instanceof Error) {
          return { erro: error.message } as const;
        }

        return {
          erro: "Não foi possível validar a seccional do perfil.",
        } as const;
      });

  if (orgao && "erro" in orgao) {
    return {
      sucesso: false,
      mensagem: orgao.erro,
      campos: dados,
    };
  }

  const codigo = perfilAtual.sistema
    ? perfilAtual.codigo
    : aplicarPrefixoSeccional(parsed.data.codigo, orgao?.sigla);
  const existe = await codigoPerfilExiste(codigo, perfilId);
  const proximoGlobal =
    !orgao && (escopoGlobal ? parsed.data.global : perfilAtual.global);
  const proximoOrgaoId = perfilAtual.sistema ? null : (orgao?.id ?? null);

  if (existe) {
    return {
      sucesso: false,
      mensagem: "Já existe outro perfil com este código.",
      erros: {
        codigo: ["Já existe outro perfil com este código."],
      },
      campos: { ...dados, codigo },
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.perfil.update({
      where: {
        id: perfilId,
      },
      data: {
        codigo,
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
        ativo: parsed.data.ativo,
        administrativo: parsed.data.administrativo,
        excecao: parsed.data.excecao,
        global: proximoGlobal,
        orgaoId: proximoOrgaoId,
        perfilDestinoExcecaoId: parsed.data.excecao
          ? parsed.data.perfilDestinoExcecaoId || null
          : null,
      },
    });

    await tx.perfilPermissao.deleteMany({
      where: {
        perfilId,
      },
    });

    if (parsed.data.permissoes.length > 0) {
      await tx.perfilPermissao.createMany({
        data: parsed.data.permissoes.map((permissaoId) => ({
          perfilId,
          permissaoId,
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Perfil",
        entidadeId: perfilId,
        acao: "PERFIL_ATUALIZADO",
        dadosAntes: {
          id: perfilAtual.id,
          codigo: perfilAtual.codigo,
          nome: perfilAtual.nome,
          descricao: perfilAtual.descricao,
          ativo: perfilAtual.ativo,
          administrativo: perfilAtual.administrativo,
          excecao: perfilAtual.excecao,
          global: perfilAtual.global,
          orgaoId: perfilAtual.orgaoId,
          perfilDestinoExcecaoId: perfilAtual.perfilDestinoExcecaoId,
          permissoes: perfilAtual.permissoes.map((item) => item.permissaoId),
        },
        dadosDepois: {
          id: perfilId,
          codigo,
          nome: parsed.data.nome,
          descricao: parsed.data.descricao || null,
          ativo: parsed.data.ativo,
          administrativo: parsed.data.administrativo,
          excecao: parsed.data.excecao,
          global: proximoGlobal,
          orgaoId: proximoOrgaoId,
          perfilDestinoExcecaoId: parsed.data.excecao
            ? parsed.data.perfilDestinoExcecaoId || null
            : null,
          permissoes: parsed.data.permissoes,
        },
      },
    });
  });

  await invalidarCacheUsuariosDoPerfil(perfilId);
  revalidatePath("/perfis");
  revalidatePath(`/perfis/${perfilId}`);

  redirect(`/perfis/${perfilId}`);
}
