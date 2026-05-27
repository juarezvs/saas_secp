"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  gestorUnidadeSchema,
  type GestorUnidadeFormState,
} from "../schemas/gestor-unidade.schema";
import { existeGestorAtivoComMesmoPapel } from "../../infrastructure/repositories/chefia.repository";

function extrairDadosGestorUnidade(formData: FormData) {
  return {
    unidadeId: String(formData.get("unidadeId") ?? ""),
    servidorId: String(formData.get("servidorId") ?? ""),
    papel: String(formData.get("papel") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataFim: String(formData.get("dataFim") ?? ""),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  };
}

export async function vincularGestorUnidadeAction(
  _estadoAnterior: GestorUnidadeFormState,
  formData: FormData
): Promise<GestorUnidadeFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "chefias:gerenciar:global"
  );

  const dados = extrairDadosGestorUnidade(formData);
  const parsed = gestorUnidadeSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const dataInicio = new Date(`${parsed.data.dataInicio}T00:00:00`);
  const dataFim = parsed.data.dataFim
    ? new Date(`${parsed.data.dataFim}T00:00:00`)
    : null;

  if (dataFim && dataFim < dataInicio) {
    return {
      sucesso: false,
      mensagem: "A data final não pode ser anterior à data inicial.",
      erros: {
        dataFim: ["A data final não pode ser anterior à data inicial."],
      },
      campos: dados,
    };
  }

  /*
   * Regra operacional:
   * - Para GESTOR_TITULAR, mantemos apenas um titular ativo por unidade.
   * - Para GESTOR_SUBSTITUTO e DELEGADO_CHEFIA, podemos permitir múltiplos,
   *   mas aqui manteremos a validação apenas para titular.
   */
  if (
    parsed.data.papel === "GESTOR_TITULAR" &&
    parsed.data.ativo &&
    !dataFim &&
    (await existeGestorAtivoComMesmoPapel({
      unidadeId: parsed.data.unidadeId,
      papel: parsed.data.papel,
    }))
  ) {
    return {
      sucesso: false,
      mensagem:
        "Já existe gestor titular ativo para esta unidade. Encerre o vínculo anterior antes de cadastrar outro titular.",
      erros: {
        papel: ["Já existe gestor titular ativo para esta unidade."],
      },
      campos: dados,
    };
  }

  const gestor = await prisma.$transaction(async (tx) => {
    if (
      parsed.data.papel === "GESTOR_TITULAR" &&
      parsed.data.ativo &&
      !dataFim
    ) {
      await tx.gestorUnidade.updateMany({
        where: {
          unidadeId: parsed.data.unidadeId,
          papel: "GESTOR_TITULAR",
          ativo: true,
          dataFim: null,
        },
        data: {
          ativo: false,
          dataFim: dataInicio,
        },
      });
    }

    const novoGestor = await tx.gestorUnidade.create({
      data: {
        unidadeId: parsed.data.unidadeId,
        servidorId: parsed.data.servidorId,
        papel: parsed.data.papel,
        ativo: parsed.data.ativo,
        dataInicio,
        dataFim,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "GestorUnidade",
        entidadeId: novoGestor.id,
        acao: "GESTOR_UNIDADE_VINCULADO",
        dadosDepois: {
          id: novoGestor.id,
          unidadeId: novoGestor.unidadeId,
          servidorId: novoGestor.servidorId,
          papel: novoGestor.papel,
          ativo: novoGestor.ativo,
          dataInicio: novoGestor.dataInicio,
          dataFim: novoGestor.dataFim,
        },
      },
    });

    return novoGestor;
  });

  revalidatePath("/chefias");
  revalidatePath(`/unidades/${gestor.unidadeId}`);
  revalidatePath(`/unidades/${gestor.unidadeId}/chefias`);

  return {
    sucesso: true,
    mensagem: "Vínculo de chefia cadastrado com sucesso.",
  };
}