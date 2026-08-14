"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  categoriaPessoaSchema,
  type CategoriaPessoaFormState,
  type CategoriaPessoaInput,
} from "../schemas/categoria-pessoa.schema";

const PATH_CATEGORIAS = "/categorias-pessoas";

function extrairDados(formData: FormData): Partial<CategoriaPessoaInput> {
  return {
    codigo: String(formData.get("codigo") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  };
}

async function exigirPermissaoCategorias() {
  return exigirUmaDasPermissoesOuRedirecionar([
    "servidores:gerenciar:global",
    "servidores:gerenciar:seccional",
  ]);
}

export async function criarCategoriaPessoaAction(
  _estadoAnterior: CategoriaPessoaFormState,
  formData: FormData,
): Promise<CategoriaPessoaFormState> {
  const permissao = await exigirPermissaoCategorias();
  const dados = extrairDados(formData);
  const parsed = categoriaPessoaSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulario.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const existente = await prisma.categoriaPessoa.findUnique({
    where: { codigo: parsed.data.codigo },
    select: { id: true },
  });

  if (existente) {
    return {
      sucesso: false,
      mensagem: "Ja existe uma categoria com este codigo.",
      erros: { codigo: ["Ja existe uma categoria com este codigo."] },
      campos: dados,
    };
  }

  const categoria = await prisma.categoriaPessoa.create({
    data: {
      codigo: parsed.data.codigo,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao || null,
      ativo: parsed.data.ativo,
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
      entidade: "CategoriaPessoa",
      entidadeId: categoria.id,
      acao: "CATEGORIA_PESSOA_CRIADA",
      dadosDepois: categoria,
    },
  });

  revalidatePath(PATH_CATEGORIAS);
  revalidatePath("/servidores");
  redirect(PATH_CATEGORIAS);
}

export async function atualizarCategoriaPessoaAction(
  categoriaId: string,
  _estadoAnterior: CategoriaPessoaFormState,
  formData: FormData,
): Promise<CategoriaPessoaFormState> {
  const permissao = await exigirPermissaoCategorias();
  const dados = extrairDados(formData);
  const parsed = categoriaPessoaSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulario.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const atual = await prisma.categoriaPessoa.findUnique({
    where: { id: categoriaId },
  });

  if (!atual) {
    return { sucesso: false, mensagem: "Categoria nao encontrada." };
  }

  const codigoEmUso = await prisma.categoriaPessoa.findUnique({
    where: { codigo: parsed.data.codigo },
    select: { id: true },
  });

  if (codigoEmUso && codigoEmUso.id !== categoriaId) {
    return {
      sucesso: false,
      mensagem: "Ja existe outra categoria com este codigo.",
      erros: { codigo: ["Ja existe outra categoria com este codigo."] },
      campos: dados,
    };
  }

  const atualizada = await prisma.categoriaPessoa.update({
    where: { id: categoriaId },
    data: {
      codigo: parsed.data.codigo,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao || null,
      ativo: parsed.data.ativo,
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
      entidade: "CategoriaPessoa",
      entidadeId: categoriaId,
      acao: "CATEGORIA_PESSOA_ATUALIZADA",
      dadosAntes: atual,
      dadosDepois: atualizada,
    },
  });

  revalidatePath(PATH_CATEGORIAS);
  revalidatePath("/servidores");
  redirect(PATH_CATEGORIAS);
}
