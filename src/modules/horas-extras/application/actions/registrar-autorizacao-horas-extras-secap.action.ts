"use server";

import { revalidatePath } from "next/cache";

import {
  obterPermissoesDaSessao,
  possuiPermissaoNaLista,
} from "@/modules/auth/application/services/permissao.service";

import {
  registrarAutorizacaoHoraExtraSecapSchema,
  type RegistrarAutorizacaoHoraExtraSecapFormState,
} from "../schemas/horas-extras-autorizacao-secap.schema";
import { registrarAutorizacaoHoraExtraSecap } from "../../infrastructure/repositories/horas-extras-autorizacao-secap.repository";

function extrairJson(formData: FormData) {
  const raw = formData.get("dados");

  if (typeof raw !== "string") {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function possuiPermissaoCadastrar(permissoes: string[]) {
  return (
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

export async function registrarAutorizacaoHorasExtrasSecapAction(
  _estadoAnterior: RegistrarAutorizacaoHoraExtraSecapFormState,
  formData: FormData,
): Promise<RegistrarAutorizacaoHoraExtraSecapFormState> {
  const permissoes = await obterPermissoesDaSessao();

  if (!permissoes.permitido) {
    return {
      sucesso: false,
      mensagem: "Sessao expirada. Entre novamente para continuar.",
    };
  }

  if (!possuiPermissaoCadastrar(permissoes.permissoes)) {
    return {
      sucesso: false,
      mensagem:
        "Voce nao possui permissao para cadastrar autorizacoes de horas extras.",
    };
  }

  const dadosBrutos = extrairJson(formData);
  const parsed =
    registrarAutorizacaoHoraExtraSecapSchema.safeParse(dadosBrutos);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados da autorizacao.",
      erros: parsed.error.flatten().fieldErrors,
      campos:
        dadosBrutos && typeof dadosBrutos === "object"
          ? dadosBrutos
          : undefined,
    };
  }

  if (
    !permissoes.perfilAtivoEscopoGlobal &&
    permissoes.orgaoIds?.length &&
    !permissoes.orgaoIds.includes(parsed.data.orgaoId)
  ) {
    return {
      sucesso: false,
      mensagem: "O orgao selecionado esta fora do seu escopo.",
      campos: parsed.data,
    };
  }

  try {
    const autorizacao = await registrarAutorizacaoHoraExtraSecap({
      dados: parsed.data,
      usuarioId: permissoes.usuarioId,
      perfilAtivoCodigo: permissoes.perfilAtivoCodigo,
    });

    revalidatePath("/administracao/horas-extras");
    revalidatePath("/gestao/horas-extras");
    revalidatePath("/folha/horas-extras");

    return {
      sucesso: true,
      mensagem: parsed.data.confirmarRegistro
        ? "Autorizacao registrada no SECP."
        : "Rascunho de autorizacao criado.",
      autorizacaoId: autorizacao.id,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar a autorizacao.",
      campos: parsed.data,
    };
  }
}
