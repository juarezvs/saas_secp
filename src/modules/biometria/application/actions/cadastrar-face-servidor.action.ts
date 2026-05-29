"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { buscarServidorBiometriaPorUsuarioId } from "../../infrastructure/repositories/biometria.repository";
import {
  templateFacialSchema,
  type BiometriaFormState,
} from "../schemas/biometria.schema";
import { calcularTemplateMedio } from "../services/comparar-template-facial.service";

export async function cadastrarFaceServidorAction(
  _estadoAnterior: BiometriaFormState,
  formData: FormData,
): Promise<BiometriaFormState> {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessão expirada. Faça login novamente.",
    };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (
    !permissoes.includes("biometria:cadastrar:proprio") &&
    !permissoes.includes("biometria:gerenciar:global")
  ) {
    return {
      sucesso: false,
      mensagem: "Você não possui permissão para cadastrar biometria facial.",
    };
  }

  const servidor = await buscarServidorBiometriaPorUsuarioId(session.user.id);

  if (!servidor) {
    return {
      sucesso: false,
      mensagem:
        "Nenhum servidor ativo foi encontrado para o usuário autenticado.",
    };
  }

  const templatesRaw = String(formData.get("templates") ?? "[]");
  const qualidade = Number(formData.get("qualidade") ?? 0);

  let templates: number[][];

  try {
    templates = JSON.parse(templatesRaw) as number[][];
  } catch {
    return {
      sucesso: false,
      mensagem: "Templates faciais inválidos.",
    };
  }

  if (!Array.isArray(templates) || templates.length < 3) {
    return {
      sucesso: false,
      mensagem: "Capture pelo menos 3 amostras faciais válidas.",
    };
  }

  const templateMedio = calcularTemplateMedio(templates);

  const parsed = templateFacialSchema.safeParse({
    template: templateMedio,
    qualidade,
    metadados: {
      algoritmo: "human-face-description",
      versaoAlgoritmo: "client",
      amostras: templates.length,
      origem: "CADASTRO_WEB",
    },
  });

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: parsed.error.issues[0]?.message ?? "Template facial inválido.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const biometriaAnterior = await tx.biometriaFacialServidor.findUnique({
      where: {
        servidorId: servidor.id,
      },
    });

    const biometria = await tx.biometriaFacialServidor.upsert({
      where: {
        servidorId: servidor.id,
      },
      update: {
        status: "ATIVO",
        template: parsed.data.template,
        templateDimensao: parsed.data.template.length,
        qualidadeMedia: parsed.data.qualidade ?? null,
        amostrasQuantidade: templates.length,
        limiarDistancia: 0.4,
        versaoAlgoritmo: parsed.data.metadados?.versaoAlgoritmo ?? null,
        termoAceiteEm: new Date(),
        atualizadoPorUsuarioId: session.user.id,
        revogadoEm: null,
        revogadoPorUsuarioId: null,
      },
      create: {
        servidorId: servidor.id,
        status: "ATIVO",
        template: parsed.data.template,
        templateDimensao: parsed.data.template.length,
        qualidadeMedia: parsed.data.qualidade ?? null,
        amostrasQuantidade: templates.length,
        limiarDistancia: 0.4,
        versaoAlgoritmo: parsed.data.metadados?.versaoAlgoritmo ?? null,
        termoAceiteEm: new Date(),
        cadastradoPorUsuarioId: session.user.id,
        atualizadoPorUsuarioId: session.user.id,
      },
    });

    await tx.amostraBiometricaFacial.createMany({
      data: templates.map((template) => ({
        biometriaId: biometria.id,
        servidorId: servidor.id,
        tipo: "CADASTRO",
        template,
        qualidade,
        validada: true,
        criadoPorUsuarioId: session.user.id,
        metadados: {
          algoritmo: "human-face-description",
          origem: "CADASTRO_WEB",
        },
      })),
    });

    const dadosAntes = biometriaAnterior
      ? {
          id: biometriaAnterior.id,
          servidorId: biometriaAnterior.servidorId,
          status: biometriaAnterior.status,
          templateDimensao: biometriaAnterior.templateDimensao,
          qualidadeMedia: biometriaAnterior.qualidadeMedia,
          amostrasQuantidade: biometriaAnterior.amostrasQuantidade,
          atualizadoEm: biometriaAnterior.atualizadoEm,
        }
      : undefined;

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "BiometriaFacialServidor",
        entidadeId: biometria.id,
        acao: biometriaAnterior
          ? "BIOMETRIA_FACIAL_RECADASTRADA"
          : "BIOMETRIA_FACIAL_CADASTRADA",
        ...(dadosAntes ? { dadosAntes } : {}),
        dadosDepois: {
          servidorId: servidor.id,
          status: "ATIVO",
          templateDimensao: parsed.data.template.length,
          amostrasQuantidade: templates.length,
          qualidade,
          recadastro: Boolean(biometriaAnterior),
        },
      },
    });
  });

  revalidatePath("/biometria");
  revalidatePath("/biometria/cadastro");

  return {
    sucesso: true,
    mensagem: "Biometria facial cadastrada com sucesso.",
  };
}
