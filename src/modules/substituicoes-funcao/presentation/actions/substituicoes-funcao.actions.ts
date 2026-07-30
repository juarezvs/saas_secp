"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  obterEscopoOrgaoDaSessao,
  whereOrgaoPermitido,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type SubstituicaoFuncaoFormState = {
  sucesso: boolean;
  mensagem: string;
  erros?: Record<string, string[]>;
};

const PERMISSOES_GERENCIAR = [
  "substituicoes-funcao:gerenciar:seccional",
  "substituicoes-funcao:gerenciar:global",
];

type TipoSubstituicaoForm = "AUTOMATICA" | "EVENTUAL" | "DESIGNADA" | "INTERINA" | "OUTRA";
type StatusSubstituicaoForm = "ATIVA" | "INATIVA" | "SUSPENSA" | "ENCERRADA";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function valorOpcional(formData: FormData, campo: string) {
  const valor = texto(formData, campo);
  return valor.length ? valor : null;
}

function dataObrigatoria(formData: FormData, campo: string) {
  const valor = texto(formData, campo);
  return valor ? new Date(`${valor}T00:00:00`) : null;
}

function dataOpcional(formData: FormData, campo: string) {
  const valor = texto(formData, campo);
  return valor ? new Date(`${valor}T00:00:00`) : null;
}

async function validarOrgaoPermitido(orgaoId: string) {
  const escopo = await obterEscopoOrgaoDaSessao();
  const orgao = await prisma.orgao.findFirst({
    where: {
      id: orgaoId,
      ativo: true,
      ...whereOrgaoPermitido(escopo),
    },
    select: { id: true },
  });

  return Boolean(orgao);
}

async function validarServidorAtivoPermitido(servidorId: string, orgaoId: string) {
  const escopo = await obterEscopoOrgaoDaSessao();
  const servidor = await prisma.servidor.findFirst({
    where: {
      id: servidorId,
      orgaoId,
      ativo: true,
      orgao: whereOrgaoPermitido(escopo),
      usuario: { ativo: true, tipo: "SERVIDOR" },
    },
    select: { id: true },
  });

  return Boolean(servidor);
}

async function extrairDados(formData: FormData) {
  const orgaoId = texto(formData, "orgaoId");
  const titularServidorId = texto(formData, "titularServidorId");
  const substitutoServidorId = texto(formData, "substitutoServidorId");
  const dataInicio = dataObrigatoria(formData, "dataInicio");
  const dataFim = dataOpcional(formData, "dataFim");
  const erros: Record<string, string[]> = {};

  if (!orgaoId) erros.orgaoId = ["Selecione a seccional."];
  if (!titularServidorId) erros.titularServidorId = ["Selecione o titular."];
  if (!substitutoServidorId) {
    erros.substitutoServidorId = ["Selecione o substituto."];
  }
  if (titularServidorId && titularServidorId === substitutoServidorId) {
    erros.substitutoServidorId = [
      "O substituto deve ser diferente do titular.",
    ];
  }
  if (!dataInicio) erros.dataInicio = ["Informe a data de início."];
  if (dataInicio && dataFim && dataFim < dataInicio) {
    erros.dataFim = ["A data final não pode ser anterior ao início."];
  }
  if (orgaoId && !(await validarOrgaoPermitido(orgaoId))) {
    erros.orgaoId = ["Seccional fora do escopo do perfil ativo."];
  }
  if (
    orgaoId &&
    titularServidorId &&
    !(await validarServidorAtivoPermitido(titularServidorId, orgaoId))
  ) {
    erros.titularServidorId = [
      "Selecione um servidor titular ativo da seccional informada.",
    ];
  }
  if (
    orgaoId &&
    substitutoServidorId &&
    !(await validarServidorAtivoPermitido(substitutoServidorId, orgaoId))
  ) {
    erros.substitutoServidorId = [
      "Selecione um servidor substituto ativo da seccional informada.",
    ];
  }

  return {
    erros,
    data: {
      orgaoId,
      unidadeId: valorOpcional(formData, "unidadeId"),
      titularServidorId,
      substitutoServidorId,
      funcaoTitularId: valorOpcional(formData, "funcaoTitularId"),
      funcaoSubstitutoId: valorOpcional(formData, "funcaoSubstitutoId"),
      tipo: (texto(formData, "tipo") || "AUTOMATICA") as TipoSubstituicaoForm,
      status: (texto(formData, "status") || "ATIVA") as StatusSubstituicaoForm,
      dataInicio: dataInicio ?? new Date(),
      dataFim,
      atoDesignacao: valorOpcional(formData, "atoDesignacao"),
      dataAtoDesignacao: dataOpcional(formData, "dataAtoDesignacao"),
      dataPublicacaoAto: dataOpcional(formData, "dataPublicacaoAto"),
      atoDispensa: valorOpcional(formData, "atoDispensa"),
      dataAtoDispensa: dataOpcional(formData, "dataAtoDispensa"),
      dataPublicacaoDispensa: dataOpcional(formData, "dataPublicacaoDispensa"),
      processoSei: valorOpcional(formData, "processoSei"),
      observacao: valorOpcional(formData, "observacao"),
      origem: "SECP" as const,
    },
  };
}

export async function salvarSubstituicaoFuncaoAction(
  _estado: SubstituicaoFuncaoFormState,
  formData: FormData,
): Promise<SubstituicaoFuncaoFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_GERENCIAR);
  const { erros, data } = await extrairDados(formData);

  if (Object.keys(erros).length) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos obrigatórios.",
      erros,
    };
  }

  const substituicao = await prisma.substituicaoFuncao.create({
    data: {
      ...data,
      criadoPorUsuarioId: permissao.usuarioId,
    },
  });

  revalidatePath("/administracao/substituicoes-funcao");
  redirect(`/administracao/substituicoes-funcao/${substituicao.id}/editar`);
}

export async function atualizarSubstituicaoFuncaoAction(
  id: string,
  _estado: SubstituicaoFuncaoFormState,
  formData: FormData,
): Promise<SubstituicaoFuncaoFormState> {
  await exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_GERENCIAR);
  const { erros, data } = await extrairDados(formData);

  if (Object.keys(erros).length) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos obrigatórios.",
      erros,
    };
  }

  await prisma.substituicaoFuncao.update({
    where: { id },
    data,
  });

  revalidatePath("/administracao/substituicoes-funcao");
  revalidatePath(`/administracao/substituicoes-funcao/${id}/editar`);

  return {
    sucesso: true,
    mensagem: "Substituição atualizada com sucesso.",
  };
}

