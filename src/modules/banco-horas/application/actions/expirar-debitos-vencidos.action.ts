"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { usuarioPossuiPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { expirarDebitosVencidosService } from "../services/expirar-debitos-vencidos.service";

export async function expirarDebitosVencidosAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  if (
    !usuarioPossuiPermissaoNoPerfil(
      session.user.perfilAtivo?.codigo,
      session.user.perfilAtivo?.permissoes,
      "banco-horas:gerenciar:global",
    )
  ) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");

  if (!servidorId) {
    return;
  }

  await expirarDebitosVencidosService({
    servidorId,
    usuarioIdAuditoria: session.user.id,
  });

  revalidatePath("/banco-horas");
  revalidatePath("/homologacao");
  revalidatePath("/relatorios");
}
