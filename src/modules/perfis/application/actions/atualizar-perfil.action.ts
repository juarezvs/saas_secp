"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  perfilSchema,
  type PerfilFormState,
} from "../schemas/perfil.schema";
import {
  buscarPerfilPorId,
  codigoPerfilExiste,
} from "../../infrastructure/repositories/perfil.repository";

function extrairDadosPerfil(formData: FormData) {
  return {
    codigo: String(formData.get("codigo") ?? "")
      .trim()
      .toUpperCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    permissoes: formData.getAll("permissoes").map(String),
  };
}

export async function atualizarPerfilAction(
  perfilId: string,
  _estadoAnterior: PerfilFormState,
  formData: FormData
): Promise<PerfilFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "perfis:gerenciar:global"
  );

  const perfilAtual = await buscarPerfilPorId(perfilId);

  if (!perfilAtual) {
    return {
      sucesso: false,
      mensagem: "Perfil não encontrado.",
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

  const existe = await codigoPerfilExiste(parsed.data.codigo, perfilId);

  if (existe) {
    return {
      sucesso: false,
      mensagem: "Já existe outro perfil com este código.",
      erros: {
        codigo: ["Já existe outro perfil com este código."],
      },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.perfil.update({
      where: {
        id: perfilId,
      },
      data: {
        codigo: parsed.data.codigo,
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
        ativo: parsed.data.ativo,
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
          permissoes: perfilAtual.permissoes.map((item) => item.permissaoId),
        },
        dadosDepois: {
          id: perfilId,
          codigo: parsed.data.codigo,
          nome: parsed.data.nome,
          descricao: parsed.data.descricao || null,
          ativo: parsed.data.ativo,
          permissoes: parsed.data.permissoes,
        },
      },
    });
  });

  revalidatePath("/perfis");
  revalidatePath(`/perfis/${perfilId}`);

  redirect(`/perfis/${perfilId}`);
}