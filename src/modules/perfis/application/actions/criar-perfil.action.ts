"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  perfilSchema,
  type PerfilFormState,
} from "../schemas/perfil.schema";
import { codigoPerfilExiste } from "../../infrastructure/repositories/perfil.repository";

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

export async function criarPerfilAction(
  _estadoAnterior: PerfilFormState,
  formData: FormData
): Promise<PerfilFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "perfis:gerenciar:global"
  );

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

  const existe = await codigoPerfilExiste(parsed.data.codigo);

  if (existe) {
    return {
      sucesso: false,
      mensagem: "Já existe um perfil com este código.",
      erros: {
        codigo: ["Já existe um perfil com este código."],
      },
      campos: dados,
    };
  }

  const perfil = await prisma.$transaction(async (tx) => {
    const novoPerfil = await tx.perfil.create({
      data: {
        codigo: parsed.data.codigo,
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
        ativo: parsed.data.ativo,
        sistema: false,
      },
    });

    if (parsed.data.permissoes.length > 0) {
      await tx.perfilPermissao.createMany({
        data: parsed.data.permissoes.map((permissaoId) => ({
          perfilId: novoPerfil.id,
          permissaoId,
        })),
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
          permissoes: parsed.data.permissoes,
        },
      },
    });

    return novoPerfil;
  });

  revalidatePath("/perfis");
  revalidatePath(`/perfis/${perfil.id}`);

  redirect(`/perfis/${perfil.id}`);
}