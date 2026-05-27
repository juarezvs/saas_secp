"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  jornadaSchema,
  type JornadaFormState,
} from "../schemas/jornada.schema";
import {
  buscarJornadaPorId,
  codigoJornadaExiste,
} from "../../infrastructure/repositories/jornada.repository";

function valorOpcionalString(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  return texto.length > 0 ? texto : null;
}

function valorOpcionalNumero(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  return texto.length > 0 ? Number(texto) : null;
}

function extrairDadosJornada(formData: FormData) {
  return {
    codigo: String(formData.get("codigo") ?? "").trim().toUpperCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    tipo: String(formData.get("tipo") ?? ""),
    cargaDiariaMinutos: Number(formData.get("cargaDiariaMinutos") ?? 0),
    exigeIntervalo:
      formData.get("exigeIntervalo") === "on" ||
      formData.get("exigeIntervalo") === "true",
    intervaloMinimoMinutos: valorOpcionalNumero(
      formData.get("intervaloMinimoMinutos")
    ),
    intervaloMaximoMinutos: valorOpcionalNumero(
      formData.get("intervaloMaximoMinutos")
    ),
    horarioEntradaPadrao: valorOpcionalString(
      formData.get("horarioEntradaPadrao")
    ),
    horarioSaidaPadrao: valorOpcionalString(formData.get("horarioSaidaPadrao")),
    horarioDiferenciadoPermitido:
      formData.get("horarioDiferenciadoPermitido") === "on" ||
      formData.get("horarioDiferenciadoPermitido") === "true",
    entradaMinimaDiferenciada: valorOpcionalString(
      formData.get("entradaMinimaDiferenciada")
    ),
    saidaMaximaDiferenciada: valorOpcionalString(
      formData.get("saidaMaximaDiferenciada")
    ),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  };
}

export async function atualizarJornadaAction(
  jornadaId: string,
  _estadoAnterior: JornadaFormState,
  formData: FormData
): Promise<JornadaFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "jornadas:gerenciar:global"
  );

  const jornadaAtual = await buscarJornadaPorId(jornadaId);

  if (!jornadaAtual) {
    return {
      sucesso: false,
      mensagem: "Jornada não encontrada.",
    };
  }

  const dados = extrairDadosJornada(formData);
  const parsed = jornadaSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  if (await codigoJornadaExiste(parsed.data.codigo, jornadaId)) {
    return {
      sucesso: false,
      mensagem: "Já existe outra jornada com este código.",
      erros: {
        codigo: ["Já existe outra jornada com este código."],
      },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.jornada.update({
      where: {
        id: jornadaId,
      },
      data: {
        codigo: parsed.data.codigo,
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
        tipo: parsed.data.tipo,
        cargaDiariaMinutos: parsed.data.cargaDiariaMinutos,
        exigeIntervalo: parsed.data.exigeIntervalo,
        intervaloMinimoMinutos: parsed.data.intervaloMinimoMinutos ?? null,
        intervaloMaximoMinutos: parsed.data.intervaloMaximoMinutos ?? null,
        horarioEntradaPadrao: parsed.data.horarioEntradaPadrao || null,
        horarioSaidaPadrao: parsed.data.horarioSaidaPadrao || null,
        horarioDiferenciadoPermitido:
          parsed.data.horarioDiferenciadoPermitido,
        entradaMinimaDiferenciada:
          parsed.data.entradaMinimaDiferenciada || null,
        saidaMaximaDiferenciada: parsed.data.saidaMaximaDiferenciada || null,
        ativo: parsed.data.ativo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Jornada",
        entidadeId: jornadaId,
        acao: "JORNADA_ATUALIZADA",
        dadosAntes: {
          id: jornadaAtual.id,
          codigo: jornadaAtual.codigo,
          nome: jornadaAtual.nome,
          tipo: jornadaAtual.tipo,
          cargaDiariaMinutos: jornadaAtual.cargaDiariaMinutos,
          exigeIntervalo: jornadaAtual.exigeIntervalo,
          intervaloMinimoMinutos: jornadaAtual.intervaloMinimoMinutos,
          intervaloMaximoMinutos: jornadaAtual.intervaloMaximoMinutos,
          ativo: jornadaAtual.ativo,
        },
        dadosDepois: parsed.data,
      },
    });
  });

  revalidatePath("/jornadas");
  revalidatePath(`/jornadas/${jornadaId}`);

  redirect(`/jornadas/${jornadaId}`);
}