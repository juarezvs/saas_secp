"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { recalcularPosSolicitacaoService } from "../services/recalcular-pos-solicitacao.service";

export async function recalcularPosSolicitacaoAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeRecalcular =
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("solicitacoes:analisar:chefia") ||
    permissoes.includes("solicitacoes:consultar:global");

  if (!podeRecalcular) {
    return;
  }

  const solicitacaoId = String(formData.get("solicitacaoId") ?? "");

  if (!solicitacaoId) {
    return;
  }

  await recalcularPosSolicitacaoService({
    solicitacaoId,
    usuarioIdAuditoria: session.user.id,
  });

  revalidatePath("/solicitacoes");
  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
  revalidatePath("/marcacoes");
}
