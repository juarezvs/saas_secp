"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { registrarEtapaSecapBoletimFrequenciaService } from "../services/transicionar-boletim-frequencia.service";

export async function receberBoletimFrequenciaAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const podeReceber = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    ["boletim-frequencia:receber:global"],
  );

  if (!podeReceber) {
    return;
  }

  const boletimId = String(formData.get("boletimId") ?? "");
  const status = String(formData.get("status") ?? "RECEBIDO_SECAP");
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!boletimId) {
    return;
  }

  if (!["RECEBIDO_SECAP", "CONFERIDO"].includes(status)) {
    return;
  }

  await registrarEtapaSecapBoletimFrequenciaService({
    boletimId,
    usuarioId: session.user.id,
    status: status as "RECEBIDO_SECAP" | "CONFERIDO",
    observacao,
  });

  revalidatePath("/boletim-frequencia");
  revalidatePath(`/boletim-frequencia/${boletimId}`);
}
