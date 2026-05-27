"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  unidadeSchema,
  type UnidadeFormState,
} from "../schemas/unidade.schema";
import {
  buscarUnidadePorId,
  codigoUnidadeExiste,
  listarIdsDescendentesDaUnidade,
} from "../../infrastructure/repositories/unidade.repository";

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

export async function atualizarUnidadeAction(
  unidadeId: string,
  _estadoAnterior: UnidadeFormState,
  formData: FormData
): Promise<UnidadeFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "unidades:gerenciar:global"
  );

  const unidadeAtual = await buscarUnidadePorId(unidadeId);

  if (!unidadeAtual) {
    return {
      sucesso: false,
      mensagem: "Unidade organizacional não encontrada.",
    };
  }

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

  if (parsed.data.unidadePaiId === unidadeId) {
    return {
      sucesso: false,
      mensagem: "A unidade não pode ser superior dela mesma.",
      erros: {
        unidadePaiId: ["A unidade não pode ser superior dela mesma."],
      },
      campos: dados,
    };
  }

  if (parsed.data.unidadePaiId) {
    const descendentes = await listarIdsDescendentesDaUnidade(unidadeId);

    if (descendentes.includes(parsed.data.unidadePaiId)) {
      return {
        sucesso: false,
        mensagem:
          "A unidade superior não pode ser uma unidade subordinada da própria unidade editada.",
        erros: {
          unidadePaiId: [
            "Selecione uma unidade superior fora da descendência desta unidade.",
          ],
        },
        campos: dados,
      };
    }
  }

  const existe = await codigoUnidadeExiste(
    parsed.data.orgaoId,
    parsed.data.codigo,
    unidadeId
  );

  if (existe) {
    return {
      sucesso: false,
      mensagem: "Já existe outra unidade com este código neste órgão.",
      erros: {
        codigo: ["Já existe outra unidade com este código neste órgão."],
      },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.unidadeOrganizacional.update({
      where: {
        id: unidadeId,
      },
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
        entidadeId: unidadeId,
        acao: "UNIDADE_ATUALIZADA",
        dadosAntes: {
          id: unidadeAtual.id,
          orgaoId: unidadeAtual.orgaoId,
          unidadePaiId: unidadeAtual.unidadePaiId,
          codigo: unidadeAtual.codigo,
          sigla: unidadeAtual.sigla,
          nome: unidadeAtual.nome,
          tipo: unidadeAtual.tipo,
          ativo: unidadeAtual.ativo,
        },
        dadosDepois: {
          id: unidadeId,
          orgaoId: parsed.data.orgaoId,
          unidadePaiId: parsed.data.unidadePaiId || null,
          codigo: parsed.data.codigo,
          sigla: parsed.data.sigla,
          nome: parsed.data.nome,
          tipo: parsed.data.tipo,
          ativo: parsed.data.ativo,
        },
      },
    });
  });

  revalidatePath("/unidades");
  revalidatePath(`/unidades/${unidadeId}`);

  redirect(`/unidades/${unidadeId}`);
}