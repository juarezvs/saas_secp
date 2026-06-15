"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { encaminharBoletimFrequenciaService } from "../services/transicionar-boletim-frequencia.service";

export async function encaminharBoletimFrequenciaAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const podeEncaminhar = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    ["boletim-frequencia:encaminhar:chefia"],
  );

  if (!podeEncaminhar) {
    return;
  }

  const boletimId = String(formData.get("boletimId") ?? "");
  const processoSei = String(formData.get("processoSei") ?? "").trim();
  const numeroSei = String(formData.get("numeroSei") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!boletimId) {
    return;
  }

  await encaminharBoletimFrequenciaService({
    boletimId,
    usuarioId: session.user.id,
    processoSei,
    numeroSei,
    observacao,
  });

  revalidatePath("/boletim-frequencia");
  revalidatePath(`/boletim-frequencia/${boletimId}`);
}
