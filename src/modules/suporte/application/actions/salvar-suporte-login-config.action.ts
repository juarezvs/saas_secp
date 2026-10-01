"use server";

import { revalidatePath } from "next/cache";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { salvarConfiguracaoSuporteLogin } from "../services/suporte-login-config.service";

export type SuporteLoginConfigState = {
  sucesso: boolean;
  mensagem: string | null;
};

export async function salvarSuporteLoginConfigAction(
  _estadoAnterior: SuporteLoginConfigState,
  formData: FormData,
): Promise<SuporteLoginConfigState> {
  await exigirUmaDasPermissoesOuRedirecionar([
    "configuracoes:gerenciar:global",
    "configuracoes:gerenciar:seccional",
  ]);

  try {
    await salvarConfiguracaoSuporteLogin({
      orgaoId: String(formData.get("orgaoId") ?? "") || null,
      url: String(formData.get("url") ?? ""),
      ativo: formData.get("ativo") === "on",
    });
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a configuração de suporte.",
    };
  }

  revalidatePath("/administracao/suporte");

  return {
    sucesso: true,
    mensagem: "URL de suporte atualizada com sucesso.",
  };
}
