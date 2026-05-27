"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { recalcularMesServidorService } from "../services/recalcular-mes-servidor.service";

export async function recalcularMesServidorAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeRecalcular =
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("banco-horas:gerenciar:global");

  if (!podeRecalcular) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const anoReferencia = Number(formData.get("anoReferencia") ?? 0);
  const mesReferencia = Number(formData.get("mesReferencia") ?? 0);

  if (!servidorId || !anoReferencia || !mesReferencia) {
    return;
  }

  await recalcularMesServidorService({
    servidorId,
    anoReferencia,
    mesReferencia,
    usuarioIdAuditoria: session.user.id,
    origem: "RECALCULO_MANUAL_MES",
  });

  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
}
