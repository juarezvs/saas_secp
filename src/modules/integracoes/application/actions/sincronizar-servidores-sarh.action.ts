"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { sincronizarServidoresSarhService } from "../services/sincronizar-servidores-sarh.service";

export async function sincronizarServidoresSarhAction() {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("integracoes:sincronizar:global")) {
    return;
  }

  await sincronizarServidoresSarhService({
    usuarioId: session.user.id,
  });

  revalidatePath("/integracoes");
  revalidatePath("/usuarios");
  revalidatePath("/servidores");
}
