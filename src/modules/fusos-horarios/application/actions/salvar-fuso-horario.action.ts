"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  fusoHorarioSchema,
  type FusoHorarioFormState,
  type FusoHorarioInput,
} from "../schemas/fuso-horario.schema";
import { existeFusoHorarioComValor } from "../../infrastructure/repositories/fuso-horario.repository";

function extrairDados(formData: FormData): Partial<FusoHorarioInput> {
  return {
    valor: String(formData.get("valor") ?? "").trim(),
    rotulo: String(formData.get("rotulo") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    ativo: formData.get("ativo") === "on",
  };
}

function revalidarFusos() {
  revalidatePath("/administracao/fusos-horarios");
  revalidatePath("/orgaos");
  revalidatePath("/orgaos/novo");
  revalidatePath("/unidades");
  revalidatePath("/unidades/nova");
}

function dadosAuditoriaFuso(
  fuso: {
    id: string;
    valor: string;
    rotulo: string;
    descricao: string | null;
    ativo: boolean;
    criadoEm: Date;
    atualizadoEm: Date;
  } | null,
) {
  if (!fuso) {
    return undefined;
  }

  return {
    id: fuso.id,
    valor: fuso.valor,
    rotulo: fuso.rotulo,
    descricao: fuso.descricao,
    ativo: fuso.ativo,
    criadoEm: fuso.criadoEm.toISOString(),
    atualizadoEm: fuso.atualizadoEm.toISOString(),
  };
}

export async function criarFusoHorarioAction(
  _estadoAnterior: FusoHorarioFormState,
  formData: FormData,
): Promise<FusoHorarioFormState> {
  const permissao = await exigirPermissao("fusos-horarios:gerenciar:global");
  const dados = extrairDados(formData);
  const parsed = fusoHorarioSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do fuso horario.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  if (await existeFusoHorarioComValor(parsed.data.valor)) {
    return {
      sucesso: false,
      mensagem: "Ja existe um fuso horario cadastrado com esse identificador.",
      erros: {
        valor: ["Identificador ja cadastrado."],
      },
      campos: dados,
    };
  }

  const fuso = await prisma.$transaction(async (tx) => {
    const novoFuso = await tx.fusoHorario.create({
      data: parsed.data,
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "FusoHorario",
        entidadeId: novoFuso.id,
        acao: "FUSO_HORARIO_CRIADO",
        dadosDepois: dadosAuditoriaFuso(novoFuso),
      },
    });

    return novoFuso;
  });

  revalidarFusos();
  redirect(`/administracao/fusos-horarios/${fuso.id}/editar`);
}

export async function atualizarFusoHorarioAction(
  fusoId: string,
  _estadoAnterior: FusoHorarioFormState,
  formData: FormData,
): Promise<FusoHorarioFormState> {
  const permissao = await exigirPermissao("fusos-horarios:gerenciar:global");
  const dados = extrairDados(formData);
  const parsed = fusoHorarioSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do fuso horario.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  if (await existeFusoHorarioComValor(parsed.data.valor, fusoId)) {
    return {
      sucesso: false,
      mensagem: "Ja existe outro fuso horario cadastrado com esse identificador.",
      erros: {
        valor: ["Identificador ja cadastrado."],
      },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    const fusoAtual = await tx.fusoHorario.findUnique({
      where: {
        id: fusoId,
      },
    });

    const fuso = await tx.fusoHorario.update({
      where: {
        id: fusoId,
      },
      data: parsed.data,
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "FusoHorario",
        entidadeId: fuso.id,
        acao: "FUSO_HORARIO_ATUALIZADO",
        dadosAntes: dadosAuditoriaFuso(fusoAtual),
        dadosDepois: dadosAuditoriaFuso(fuso),
      },
    });
  });

  revalidarFusos();
  revalidatePath(`/administracao/fusos-horarios/${fusoId}/editar`);

  return {
    sucesso: true,
    mensagem: "Fuso horario atualizado com sucesso.",
    campos: parsed.data,
  };
}
