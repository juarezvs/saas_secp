"use server";

import { revalidatePath } from "next/cache";

import {
  obterPermissoesDaSessao,
  possuiPermissaoNaLista,
} from "@/modules/auth/application/services/permissao.service";

import { processarExecucaoAutorizacaoHorasExtras } from "../services/processar-execucao-autorizacao-horas-extras.service";

export type ProcessarExecucaoHorasExtrasSecapFormState = {
  sucesso: boolean;
  mensagem: string;
};

function podeProcessar(permissoes: string[]) {
  return (
    possuiPermissaoNaLista(
      permissoes,
      "horas-extras:visualizar-execucao:global",
    ) ||
    possuiPermissaoNaLista(
      permissoes,
      "horas-extras:visualizar-execucao:seccional",
    ) ||
    possuiPermissaoNaLista(
      permissoes,
      "horas-extras:cadastrar-autorizacao:global",
    ) ||
    possuiPermissaoNaLista(
      permissoes,
      "horas-extras:cadastrar-autorizacao:seccional",
    )
  );
}

export async function processarExecucaoHorasExtrasSecapAction(
  _estadoAnterior: ProcessarExecucaoHorasExtrasSecapFormState,
  formData: FormData,
): Promise<ProcessarExecucaoHorasExtrasSecapFormState> {
  const permissao = await obterPermissoesDaSessao();

  if (!permissao.permitido) {
    return {
      sucesso: false,
      mensagem: "Sessao expirada. Entre novamente para continuar.",
    };
  }

  if (!podeProcessar(permissao.permissoes)) {
    return {
      sucesso: false,
      mensagem:
        "Voce nao possui permissao para processar execucao de horas extras.",
    };
  }

  const autorizacaoId = String(formData.get("autorizacaoId") ?? "");

  if (!autorizacaoId) {
    return {
      sucesso: false,
      mensagem: "Autorizacao nao informada.",
    };
  }

  try {
    const totais = await processarExecucaoAutorizacaoHorasExtras({
      autorizacaoId,
      usuarioId: permissao.usuarioId,
      perfilAtivoCodigo: permissao.perfilAtivoCodigo,
    });

    revalidatePath("/horas-extras/autorizacoes");
    revalidatePath("/gestao/horas-extras");

    return {
      sucesso: true,
      mensagem: `Execucao processada: ${totais.intervalos} intervalo(s), ${totais.reconhecida} minuto(s) reconhecido(s).`,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel processar a execucao.",
    };
  }
}
