"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { regerarBancoHorasMesService } from "@/modules/recalculo/application/services/regerar-banco-horas-mes.service";

export async function gerarMovimentosBancoHorasAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("banco-horas:gerenciar:global")) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const anoReferencia = Number(formData.get("anoReferencia") ?? 0);
  const mesReferencia = Number(formData.get("mesReferencia") ?? 0);

  if (!servidorId || !anoReferencia || !mesReferencia) {
    return;
  }

  await regerarBancoHorasMesService({
    servidorId,
    anoReferencia,
    mesReferencia,
    usuarioIdAuditoria: session.user.id,
    origem: "GERACAO_MANUAL_BANCO_HORAS_PAGE",
  });

  revalidatePath("/banco-horas");
  revalidatePath("/espelho-ponto");
}
