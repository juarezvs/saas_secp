"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { reprocessarMarcacoesBrutasPendentesService } from "../services/reprocessar-marcacoes-brutas-pendentes.service";

export async function reprocessarMarcacoesBrutasPendentesAction() {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeReprocessar =
    permissoes.includes("afd:importar:global") ||
    permissoes.includes("marcacoes:gerenciar:global");

  if (!podeReprocessar) {
    return;
  }

  await reprocessarMarcacoesBrutasPendentesService({
    usuarioId: session.user.id,
    limite: 1000,
  });

  revalidatePath("/afd");
  revalidatePath("/marcacoes");
  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
}