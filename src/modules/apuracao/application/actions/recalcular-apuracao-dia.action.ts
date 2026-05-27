"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { normalizarDataReferencia } from "../services/calcular-tempo.service";
import { recalcularDiaServidorService } from "@/modules/recalculo/application/services/recalcular-dia-servidor.service";

export async function recalcularApuracaoDiaAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeRecalcular =
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("apuracao:consultar:proprio");

  if (!podeRecalcular) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const data = String(formData.get("dataReferencia") ?? "");

  if (!servidorId || !data) {
    return;
  }

  const dataReferencia = normalizarDataReferencia(new Date(`${data}T00:00:00`));

  await recalcularDiaServidorService({
    servidorId,
    dataReferencia,
    usuarioIdAuditoria: session.user.id,
    origem: "RECALCULO_MANUAL_APURACAO_PAGE",
  });

  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/marcacoes");
}
