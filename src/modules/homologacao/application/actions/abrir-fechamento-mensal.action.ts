"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prepararFechamentoUnidadeService } from "../services/preparar-fechamento-unidade.service";

export async function abrirFechamentoMensalAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeGerenciar =
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("homologacao:gerenciar:global");

  if (!podeGerenciar) {
    return;
  }

  const unidadeId = String(formData.get("unidadeId") ?? "");
  const anoReferencia = Number(formData.get("anoReferencia") ?? 0);
  const mesReferencia = Number(formData.get("mesReferencia") ?? 0);
  const recalcularAntes = formData.get("recalcularAntes") === "on";

  if (!unidadeId || !anoReferencia || !mesReferencia) {
    return;
  }

  const fechamento = await prepararFechamentoUnidadeService({
    unidadeId,
    anoReferencia,
    mesReferencia,
    usuarioId: session.user.id,
    recalcularAntes,
  });

  revalidatePath("/homologacao");
  revalidatePath(`/homologacao/${fechamento.id}`);

  redirect(`/homologacao/${fechamento.id}`);
}
