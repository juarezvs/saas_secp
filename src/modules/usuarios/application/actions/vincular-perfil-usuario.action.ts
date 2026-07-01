"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  vincularPerfilUsuarioSchema,
  type VincularPerfilUsuarioFormState,
} from "../schemas/usuario.schema";
import { buscarUsuarioPerfil } from "../../infrastructure/repositories/usuario.repository";

function extrairDados(formData: FormData) {
  return {
    usuarioId: String(formData.get("usuarioId") ?? ""),
    perfilId: String(formData.get("perfilId") ?? ""),
    orgaoId: String(formData.get("orgaoId") ?? ""),
  };
}

export async function vincularPerfilUsuarioAction(
  _estadoAnterior: VincularPerfilUsuarioFormState,
  formData: FormData
): Promise<VincularPerfilUsuarioFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "usuarios:gerenciar:global"
  );

  const dados = extrairDados(formData);
  const parsed = vincularPerfilUsuarioSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados do vínculo.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const perfil = await prisma.perfil.findUnique({
    where: { id: parsed.data.perfilId },
    select: { codigo: true, nome: true },
  });

  if (!perfil) {
    return {
      sucesso: false,
      mensagem: "Perfil nao encontrado.",
      campos: dados,
    };
  }

  if (perfil.codigo !== "MASTER" && !parsed.data.orgaoId) {
    return {
      sucesso: false,
      mensagem: `Selecione a seccional para o perfil ${perfil.nome}.`,
      campos: dados,
    };
  }

  const orgaoId = perfil.codigo === "MASTER" ? null : parsed.data.orgaoId || null;
  const vinculoExistente = await buscarUsuarioPerfil({
    usuarioId: parsed.data.usuarioId,
    perfilId: parsed.data.perfilId,
    orgaoId,
  });

  await prisma.$transaction(async (tx) => {
    if (vinculoExistente) {
      await tx.usuarioPerfil.update({
        where: {
          id: vinculoExistente.id,
        },
        data: {
          ativo: true,
        },
      });
    } else {
      await tx.usuarioPerfil.create({
        data: {
          usuarioId: parsed.data.usuarioId,
          perfilId: parsed.data.perfilId,
          orgaoId,
          ativo: true,
        },
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "UsuarioPerfil",
        entidadeId: parsed.data.usuarioId,
        acao: "USUARIO_PERFIL_VINCULADO",
        dadosDepois: {
          usuarioId: parsed.data.usuarioId,
          perfilId: parsed.data.perfilId,
          orgaoId,
        },
      },
    });
  });

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${parsed.data.usuarioId}`);

  return {
    sucesso: true,
    mensagem: "Perfil vinculado ao usuário com sucesso.",
  };
}
