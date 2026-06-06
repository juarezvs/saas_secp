"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function receberBoletimFrequenciaAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const podeReceber = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    ["boletim-frequencia:receber:global"],
  );

  if (!podeReceber) {
    return;
  }

  const boletimId = String(formData.get("boletimId") ?? "");
  const status = String(formData.get("status") ?? "RECEBIDO_SECAP");
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!boletimId) {
    return;
  }

  if (!["RECEBIDO_SECAP", "CONFERIDO"].includes(status)) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const boletimAtual = await tx.boletimFrequencia.findUnique({
      where: {
        id: boletimId,
      },
    });

    if (!boletimAtual) {
      return;
    }

    await tx.boletimFrequencia.update({
      where: {
        id: boletimId,
      },
      data: {
        status: status as never,
        recebidoPorUsuarioId: session.user.id,
        recebidoEm: new Date(),
        observacao: observacao || boletimAtual.observacao,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "BoletimFrequencia",
        entidadeId: boletimId,
        acao:
          status === "CONFERIDO"
            ? "BOLETIM_FREQUENCIA_CONFERIDO"
            : "BOLETIM_FREQUENCIA_RECEBIDO_SECAP",
        dadosAntes: {
          status: boletimAtual.status,
        },
        dadosDepois: {
          status,
          observacao,
        },
      },
    });
  });

  revalidatePath("/boletim-frequencia");
  revalidatePath(`/boletim-frequencia/${boletimId}`);
}
