"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function encaminharBoletimFrequenciaAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeEncaminhar =
    permissoes.includes("boletim-frequencia:encaminhar:chefia") ||
    permissoes.includes("boletim-frequencia:consultar:global");

  if (!podeEncaminhar) {
    return;
  }

  const boletimId = String(formData.get("boletimId") ?? "");
  const processoSei = String(formData.get("processoSei") ?? "").trim();
  const numeroSei = String(formData.get("numeroSei") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!boletimId) {
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
        status: "ENCAMINHADO_SECAP",
        processoSei: processoSei || boletimAtual.processoSei,
        numeroSei: numeroSei || boletimAtual.numeroSei,
        observacao: observacao || boletimAtual.observacao,
        encaminhadoPorUsuarioId: session.user.id,
        encaminhadoEm: new Date(),
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "BoletimFrequencia",
        entidadeId: boletimId,
        acao: "BOLETIM_FREQUENCIA_ENCAMINHADO_SECAP",
        dadosAntes: {
          status: boletimAtual.status,
          processoSei: boletimAtual.processoSei,
          numeroSei: boletimAtual.numeroSei,
        },
        dadosDepois: {
          status: "ENCAMINHADO_SECAP",
          processoSei,
          numeroSei,
        },
      },
    });
  });

  revalidatePath("/boletim-frequencia");
  revalidatePath(`/boletim-frequencia/${boletimId}`);
}
