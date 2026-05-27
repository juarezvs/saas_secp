"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export async function alterarStatusPerfilUsuarioAction(
  usuarioPerfilId: string,
  usuarioId: string,
  ativo: boolean,
  _formData: FormData
) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "usuarios:gerenciar:global"
  );

  const vinculoAtual = await prisma.usuarioPerfil.findUnique({
    where: {
      id: usuarioPerfilId,
    },
    include: {
      perfil: true,
    },
  });

  if (!vinculoAtual) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuarioPerfil.update({
      where: {
        id: usuarioPerfilId,
      },
      data: {
        ativo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "UsuarioPerfil",
        entidadeId: usuarioPerfilId,
        acao: ativo ? "USUARIO_PERFIL_ATIVADO" : "USUARIO_PERFIL_INATIVADO",
        dadosAntes: {
          usuarioId: vinculoAtual.usuarioId,
          perfilId: vinculoAtual.perfilId,
          ativo: vinculoAtual.ativo,
        },
        dadosDepois: {
          usuarioId: vinculoAtual.usuarioId,
          perfilId: vinculoAtual.perfilId,
          perfil: vinculoAtual.perfil.codigo,
          ativo,
        },
      },
    });
  });

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${usuarioId}`);
}