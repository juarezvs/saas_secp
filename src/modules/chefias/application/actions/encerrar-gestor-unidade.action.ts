"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarGestorUnidadePorId } from "../../infrastructure/repositories/chefia.repository";

export async function encerrarGestorUnidadeAction(
  gestorUnidadeId: string,
  unidadeId: string,
  _formData: FormData
) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "chefias:gerenciar:global"
  );

  const gestorAtual = await buscarGestorUnidadePorId(gestorUnidadeId);

  if (!gestorAtual) {
    return;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  await prisma.$transaction(async (tx) => {
    await tx.gestorUnidade.update({
      where: {
        id: gestorUnidadeId,
      },
      data: {
        ativo: false,
        dataFim: gestorAtual.dataFim ?? hoje,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "GestorUnidade",
        entidadeId: gestorUnidadeId,
        acao: "GESTOR_UNIDADE_ENCERRADO",
        dadosAntes: {
          id: gestorAtual.id,
          unidadeId: gestorAtual.unidadeId,
          servidorId: gestorAtual.servidorId,
          papel: gestorAtual.papel,
          ativo: gestorAtual.ativo,
          dataInicio: gestorAtual.dataInicio,
          dataFim: gestorAtual.dataFim,
        },
        dadosDepois: {
          id: gestorAtual.id,
          unidadeId: gestorAtual.unidadeId,
          servidorId: gestorAtual.servidorId,
          papel: gestorAtual.papel,
          ativo: false,
          dataInicio: gestorAtual.dataInicio,
          dataFim: gestorAtual.dataFim ?? hoje,
        },
      },
    });
  });

  revalidatePath("/chefias");
  revalidatePath(`/unidades/${unidadeId}`);
  revalidatePath(`/unidades/${unidadeId}/chefias`);
}