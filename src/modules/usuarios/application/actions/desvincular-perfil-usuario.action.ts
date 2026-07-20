"use server";

import { revalidatePath } from "next/cache";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { invalidarCacheUsuarioAuthPorId } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function desvincularPerfilUsuarioAction(
  usuarioPerfilId: string,
  usuarioId: string,
) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "usuarios:gerenciar:global",
  );

  const vinculoAtual = await prisma.usuarioPerfil.findUnique({
    where: { id: usuarioPerfilId },
    include: {
      perfil: true,
      orgao: true,
    },
  });

  if (!vinculoAtual) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuarioPerfil.delete({
      where: { id: usuarioPerfilId },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "UsuarioPerfil",
        entidadeId: usuarioPerfilId,
        acao: "USUARIO_PERFIL_DESVINCULADO",
        dadosAntes: {
          usuarioId: vinculoAtual.usuarioId,
          perfilId: vinculoAtual.perfilId,
          perfil: vinculoAtual.perfil.codigo,
          orgaoId: vinculoAtual.orgaoId,
          orgao: vinculoAtual.orgao?.sigla ?? null,
          ativo: vinculoAtual.ativo,
        },
      },
    });
  });

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${usuarioId}`);
  revalidatePath("/", "layout");
  await invalidarCacheUsuarioAuthPorId(usuarioId);
}
