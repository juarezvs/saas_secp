"use server";

import { revalidatePath } from "next/cache";

import {
  obterPermissoesDaSessao,
  possuiPermissaoNaLista,
} from "@/modules/auth/application/services/permissao.service";

import { gerarAtestoHorasExtras } from "../services/gerar-atesto-horas-extras.service";

export type GerarAtestoHorasExtrasFormState = {
  sucesso: boolean;
  mensagem: string;
};

function podeAtestar(permissoes: string[]) {
  return (
    possuiPermissaoNaLista(permissoes, "horas-extras:analisar:chefia") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:analisar:subordinados") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:deliberar:global") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:deliberar:seccional")
  );
}

export async function gerarAtestoHorasExtrasAction(
  _estadoAnterior: GerarAtestoHorasExtrasFormState,
  formData: FormData,
): Promise<GerarAtestoHorasExtrasFormState> {
  const permissao = await obterPermissoesDaSessao();

  if (!permissao.permitido || !permissao.usuarioId) {
    return {
      sucesso: false,
      mensagem: "Sessao expirada. Entre novamente para continuar.",
    };
  }

  if (!podeAtestar(permissao.permissoes)) {
    return {
      sucesso: false,
      mensagem: "Voce nao possui permissao para gerar atesto.",
    };
  }

  const autorizacaoId = String(formData.get("autorizacaoId") ?? "");
  const texto = String(formData.get("texto") ?? "");

  if (!autorizacaoId) {
    return {
      sucesso: false,
      mensagem: "Autorizacao nao informada.",
    };
  }

  try {
    await gerarAtestoHorasExtras({
      autorizacaoId,
      gestorUsuarioId: permissao.usuarioId,
      texto,
      perfilAtivoCodigo: permissao.perfilAtivoCodigo,
    });

    revalidatePath("/horas-extras/autorizacoes");
    revalidatePath("/gestao/horas-extras");

    return {
      sucesso: true,
      mensagem: "Atesto gerado.",
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o atesto.",
    };
  }
}
