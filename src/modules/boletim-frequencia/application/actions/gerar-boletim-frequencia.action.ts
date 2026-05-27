"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { gerarBoletimUnidadeService } from "../services/gerar-boletim-unidade.service";

export async function gerarBoletimFrequenciaAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeGerar =
    permissoes.includes("boletim-frequencia:gerar:chefia") ||
    permissoes.includes("boletim-frequencia:consultar:global");

  if (!podeGerar) {
    return;
  }

  const fechamentoId = String(formData.get("fechamentoId") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!fechamentoId) {
    return;
  }

  const boletim = await gerarBoletimUnidadeService({
    fechamentoId,
    usuarioId: session.user.id,
    observacao,
  });

  revalidatePath("/boletim-frequencia");
  revalidatePath(`/boletim-frequencia/${boletim.id}`);
  revalidatePath(`/homologacao/${fechamentoId}`);

  redirect(`/boletim-frequencia/${boletim.id}`);
}
