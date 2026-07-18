"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { existeOrgaoComSigla } from "../../infrastructure/repositories/orgao.repository";
import {
  orgaoSchema,
  type OrgaoFormState,
  type OrgaoInput,
} from "../schemas/orgao.schema";

function checkboxLigado(formData: FormData, nome: string) {
  return formData.get(nome) === "on" || formData.get(nome) === "true";
}

function extrairDados(formData: FormData): Partial<OrgaoInput> {
  return {
    sigla: String(formData.get("sigla") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    codigoExternoSarh: String(formData.get("codigoExternoSarh") ?? ""),
    fusoHorario: String(formData.get("fusoHorario") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    municipio: String(formData.get("municipio") ?? ""),
    municipioIbge: String(formData.get("municipioIbge") ?? ""),
    ativo: checkboxLigado(formData, "ativo"),
  };
}

function dadosPersistencia(dados: OrgaoInput) {
  return {
    sigla: dados.sigla,
    nome: dados.nome,
    codigoExternoSarh: dados.codigoExternoSarh
      ? Number(dados.codigoExternoSarh)
      : null,
    fusoHorario: dados.fusoHorario
      ? normalizarFusoHorario(dados.fusoHorario)
      : null,
    uf: dados.uf || null,
    municipio: dados.municipio || null,
    municipioIbge: dados.municipioIbge || null,
    ativo: dados.ativo,
  };
}

function revalidar() {
  revalidatePath("/orgaos");
  revalidatePath("/administracao");
  revalidatePath("/unidades");
  revalidatePath("/marcacoes");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
}

export async function criarOrgaoAction(
  _estadoAnterior: OrgaoFormState,
  formData: FormData,
): Promise<OrgaoFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "unidades:gerenciar:global",
  );
  const dados = extrairDados(formData);
  const parsed = orgaoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do órgão.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  if (await existeOrgaoComSigla(parsed.data.sigla)) {
    return {
      sucesso: false,
      mensagem: "Já existe um órgão com esta sigla.",
      erros: { sigla: ["Já existe um órgão com esta sigla."] },
      campos: dados,
    };
  }

  const orgao = await prisma.$transaction(async (tx) => {
    const criado = await tx.orgao.create({
      data: dadosPersistencia(parsed.data),
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Orgao",
        entidadeId: criado.id,
        acao: "ORGAO_CRIADO",
        dadosDepois: criado,
      },
    });

    return criado;
  });

  revalidar();
  redirect(`/orgaos/${orgao.id}/editar`);
}

export async function atualizarOrgaoAction(
  orgaoId: string,
  _estadoAnterior: OrgaoFormState,
  formData: FormData,
): Promise<OrgaoFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "unidades:gerenciar:global",
  );
  const atual = await prisma.orgao.findUnique({ where: { id: orgaoId } });

  if (!atual) {
    return {
      sucesso: false,
      mensagem: "Órgão não encontrado.",
    };
  }

  const dados = extrairDados(formData);
  const parsed = orgaoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do órgão.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  if (await existeOrgaoComSigla(parsed.data.sigla, orgaoId)) {
    return {
      sucesso: false,
      mensagem: "Já existe outro órgão com esta sigla.",
      erros: { sigla: ["Já existe outro órgão com esta sigla."] },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    const atualizado = await tx.orgao.update({
      where: { id: orgaoId },
      data: dadosPersistencia(parsed.data),
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Orgao",
        entidadeId: orgaoId,
        acao: "ORGAO_ATUALIZADO",
        dadosAntes: atual,
        dadosDepois: atualizado,
      },
    });
  });

  revalidar();
  redirect(`/orgaos/${orgaoId}/editar`);
}
