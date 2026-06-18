"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { marcarNotificacaoComoLida } from "@/modules/notificacoes/application/notificacoes.service";

function normalizarHref(valor: FormDataEntryValue | null) {
  const href = String(valor ?? "/notificacoes");

  if (!href.startsWith("/") || href.startsWith("//")) {
    return "/notificacoes";
  }

  return href;
}

export async function abrirNotificacaoAction(formData: FormData) {
  const session = await auth();
  const notificacaoId = String(formData.get("notificacaoId") ?? "");
  const href = normalizarHref(formData.get("href"));

  if (session?.user && notificacaoId) {
    await marcarNotificacaoComoLida(session.user.id, notificacaoId);
  }

  redirect(href);
}
