"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  unidadeSchema,
  type UnidadeFormState,
} from "../schemas/unidade.schema";
import { codigoUnidadeExiste } from "../../infrastructure/repositories/unidade.repository";

function extrairDadosUnidade(formData: FormData) {
  return {
    orgaoId: String(formData.get("orgaoId") ?? ""),
    unidadePaiId: String(formData.get("unidadePaiId") ?? ""),
    codigo: String(formData.get("codigo") ?? "")
      .trim()
      .toUpperCase(),
    sigla: String(formData.get("sigla") ?? "")
      .trim()
      .toUpperCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    tipo: String(formData.get("tipo") ?? ""),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  };
}

export async function criarUnidadeAction(
  _estadoAnterior: UnidadeFormState,
  formData: FormData
): Promise<UnidadeFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "unidades:gerenciar:global"
  );

  const dados = extrairDadosUnidade(formData);
  const parsed = unidadeSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const existe = await codigoUnidadeExiste(
    parsed.data.orgaoId,
    parsed.data.codigo
  );

  if (existe) {
    return {
      sucesso: false,
      mensagem: "Já existe uma unidade com este código neste órgão.",
      erros: {
        codigo: ["Já existe uma unidade com este código neste órgão."],
      },
      campos: dados,
    };
  }

  const unidade = await prisma.$transaction(async (tx) => {
    const novaUnidade = await tx.unidadeOrganizacional.create({
      data: {
        orgaoId: parsed.data.orgaoId,
        unidadePaiId: parsed.data.unidadePaiId || null,
        codigo: parsed.data.codigo,
        sigla: parsed.data.sigla,
        nome: parsed.data.nome,
        tipo: parsed.data.tipo,
        ativo: parsed.data.ativo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "UnidadeOrganizacional",
        entidadeId: novaUnidade.id,
        acao: "UNIDADE_CRIADA",
        dadosDepois: {
          id: novaUnidade.id,
          orgaoId: novaUnidade.orgaoId,
          unidadePaiId: novaUnidade.unidadePaiId,
          codigo: novaUnidade.codigo,
          sigla: novaUnidade.sigla,
          nome: novaUnidade.nome,
          tipo: novaUnidade.tipo,
          ativo: novaUnidade.ativo,
        },
      },
    });

    return novaUnidade;
  });

  revalidatePath("/unidades");
  revalidatePath(`/unidades/${unidade.id}`);

  redirect(`/unidades/${unidade.id}`);
}