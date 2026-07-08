"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  salvarLiberacoesRotinas,
  type LiberacaoRotinaRegistro,
} from "../services/liberacao-rotinas.service";

export async function salvarLiberacoesRotinasAction(formData: FormData) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "configuracoes:gerenciar:global",
  );
  const liberacoes: LiberacaoRotinaRegistro[] = [];

  for (const [chave, valor] of formData.entries()) {
    if (typeof valor !== "string") {
      continue;
    }

    if (chave.startsWith("rotina:")) {
      liberacoes.push({
        tipo: "ROTINA",
        chave: chave.replace("rotina:", ""),
        liberada: valor === "true",
      });
    }

    if (chave.startsWith("permissao:")) {
      liberacoes.push({
        tipo: "PERMISSAO",
        chave: chave.replace("permissao:", ""),
        liberada: valor === "true",
      });
    }
  }

  await salvarLiberacoesRotinas({
    liberacoes,
    usuarioId: permissao.usuarioId,
  });

  revalidatePath("/");
  revalidatePath("/administracao");
  revalidatePath("/administracao/liberacao-rotinas");

  redirect("/administracao/liberacao-rotinas?salvo=1");
}
