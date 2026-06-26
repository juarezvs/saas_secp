"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  FUSOS_HORARIOS_OPCOES,
  normalizarFusoHorario,
} from "@/modules/marcacoes/application/services/data-marcacao.service";

const fusosPermitidos = new Set<string>(
  FUSOS_HORARIOS_OPCOES.map((fuso) => fuso.valor),
);

export async function atualizarFusoOrgaoAction(
  orgaoId: string,
  formData: FormData,
) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "unidades:gerenciar:global",
  );
  const fusoInformado = String(formData.get("fusoHorario") ?? "").trim();

  if (fusoInformado && !fusosPermitidos.has(fusoInformado)) {
    throw new Error("Fuso horario invalido.");
  }

  const fusoHorario = fusoInformado
    ? normalizarFusoHorario(fusoInformado)
    : null;

  const orgaoAtual = await prisma.orgao.findUnique({
    where: {
      id: orgaoId,
    },
    select: {
      fusoHorario: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.orgao.update({
      where: {
        id: orgaoId,
      },
      data: {
        fusoHorario,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Orgao",
        entidadeId: orgaoId,
        acao: "ORGAO_FUSO_ATUALIZADO",
        dadosAntes: {
          fusoHorario: orgaoAtual?.fusoHorario ?? null,
        },
        dadosDepois: {
          fusoHorario,
        },
      },
    });
  });

  revalidatePath("/orgaos");
  revalidatePath("/unidades");
  revalidatePath("/marcacoes");
  revalidatePath("/marcacoes-brutas");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
}
