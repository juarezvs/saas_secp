"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function excluirPerfilAction(perfilId: string) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "perfis:gerenciar:global",
    "perfis:gerenciar:seccional",
  ]);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();

  const perfil = await prisma.perfil.findUnique({
    where: { id: perfilId },
    include: {
      _count: {
        select: {
          usuarios: true,
        },
      },
      permissoes: {
        select: {
          permissaoId: true,
        },
      },
    },
  });

  if (!perfil) {
    return;
  }

  if (
    perfil.sistema ||
    perfil._count.usuarios > 0 ||
    (!escopoOrgao.global &&
      !perfil.global &&
      (!perfil.orgaoId || !escopoOrgao.orgaoIds.includes(perfil.orgaoId)))
  ) {
    revalidatePath(`/perfis/${perfilId}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.perfil.delete({
      where: { id: perfilId },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Perfil",
        entidadeId: perfilId,
        acao: "PERFIL_EXCLUIDO",
        dadosAntes: {
          id: perfil.id,
          codigo: perfil.codigo,
          nome: perfil.nome,
          descricao: perfil.descricao,
          ativo: perfil.ativo,
          sistema: perfil.sistema,
          permissoes: perfil.permissoes.map((item) => item.permissaoId),
        },
      },
    });
  });

  revalidatePath("/perfis");
  redirect("/perfis");
}
