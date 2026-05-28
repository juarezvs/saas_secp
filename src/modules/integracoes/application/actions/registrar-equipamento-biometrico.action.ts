"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  equipamentoBiometricoSchema,
  type EquipamentoBiometricoFormState,
} from "../schemas/integracao.schema";

function extrairDados(formData: FormData) {
  return {
    codigo: String(formData.get("codigo") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    unidadeId: String(formData.get("unidadeId") ?? ""),
    fabricante: String(formData.get("fabricante") ?? "").trim(),
    modelo: String(formData.get("modelo") ?? "").trim(),
    numeroSerie: String(formData.get("numeroSerie") ?? "").trim(),
    localizacao: String(formData.get("localizacao") ?? "").trim(),
    ip: String(formData.get("ip") ?? "").trim(),
    porta: String(formData.get("porta") ?? ""),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  };
}

export async function registrarEquipamentoBiometricoAction(
  _estadoAnterior: EquipamentoBiometricoFormState,
  formData: FormData,
): Promise<EquipamentoBiometricoFormState> {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessão expirada. Faça login novamente.",
    };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("integracoes:gerenciar:global")) {
    return {
      sucesso: false,
      mensagem: "Você não possui permissão para gerenciar integrações.",
    };
  }

  const dados = extrairDados(formData);
  const parsed = equipamentoBiometricoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados do equipamento.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const existente = await prisma.equipamentoBiometrico.findUnique({
    where: {
      codigo: parsed.data.codigo,
    },
  });

  if (existente) {
    return {
      sucesso: false,
      mensagem: "Já existe um equipamento com este código.",
      erros: {
        codigo: ["Já existe um equipamento com este código."],
      },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    const integracao = await tx.integracaoSistema.upsert({
      where: {
        id: "00000000-0000-0000-0000-000000000102",
      },
      update: {
        nome: "Equipamentos biométricos",
        tipo: "EQUIPAMENTO_BIOMETRICO",
        direcao: "ENTRADA",
        status: "ATIVA",
        ativo: true,
      },
      create: {
        id: "00000000-0000-0000-0000-000000000102",
        nome: "Equipamentos biométricos",
        tipo: "EQUIPAMENTO_BIOMETRICO",
        direcao: "ENTRADA",
        status: "ATIVA",
        ativo: true,
        descricao:
          "Integração responsável por receber eventos de equipamentos biométricos.",
      },
    });

    const equipamento = await tx.equipamentoBiometrico.create({
      data: {
        integracaoId: integracao.id,
        codigo: parsed.data.codigo,
        nome: parsed.data.nome,
        unidadeId: parsed.data.unidadeId || null,
        fabricante: parsed.data.fabricante || null,
        modelo: parsed.data.modelo || null,
        numeroSerie: parsed.data.numeroSerie || null,
        localizacao: parsed.data.localizacao || null,
        ip: parsed.data.ip || null,
        porta: typeof parsed.data.porta === "number" ? parsed.data.porta : null,
        ativo: parsed.data.ativo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "EquipamentoBiometrico",
        entidadeId: equipamento.id,
        acao: "EQUIPAMENTO_BIOMETRICO_CRIADO",
        dadosDepois: {
          id: equipamento.id,
          codigo: equipamento.codigo,
          nome: equipamento.nome,
          unidadeId: equipamento.unidadeId,
          ativo: equipamento.ativo,
        },
      },
    });
  });

  revalidatePath("/integracoes");

  return {
    sucesso: true,
    mensagem: "Equipamento biométrico cadastrado com sucesso.",
  };
}
