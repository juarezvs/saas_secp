"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  buscarEventoCalendarioInstitucionalPorData,
  buscarEventoCalendarioInstitucionalPorId,
} from "../../infrastructure/repositories/calendario-institucional.repository";
import {
  calendarioInstitucionalSchema,
  type CalendarioInstitucionalFormState,
  type CalendarioInstitucionalInput,
} from "../schemas/calendario-institucional.schema";
import { enfileirarReflexosCalendarioInstitucional } from "../queues/calendario-institucional-queue";

function valorOpcionalString(valor: FormDataEntryValue | null) {
  return String(valor ?? "").trim();
}

function normalizarTipoCalendarioInstitucional(
  valor: FormDataEntryValue | null,
): CalendarioInstitucionalInput["tipo"] | undefined {
  const tipo = String(valor ?? "").trim();

  return ["FERIADO", "PONTO_FACULTATIVO", "SUSPENSAO_EXPEDIENTE"].includes(tipo)
    ? (tipo as CalendarioInstitucionalInput["tipo"])
    : undefined;
}

function extrairDadosCalendario(
  formData: FormData,
): Partial<CalendarioInstitucionalInput> {
  return {
    dataReferencia: String(formData.get("dataReferencia") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    tipo: normalizarTipoCalendarioInstitucional(formData.get("tipo")),
    contaComoDiaUtil:
      formData.get("contaComoDiaUtil") === "on" ||
      formData.get("contaComoDiaUtil") === "true",
    geraApuracaoRegular:
      formData.get("geraApuracaoRegular") === "on" ||
      formData.get("geraApuracaoRegular") === "true",
    janelaInicio: valorOpcionalString(formData.get("janelaInicio")),
    janelaFim: valorOpcionalString(formData.get("janelaFim")),
    dataOriginal: valorOpcionalString(formData.get("dataOriginal")),
    dataSubstituida:
      formData.get("dataSubstituida") === "on" ||
      formData.get("dataSubstituida") === "true",
    observacao: valorOpcionalString(formData.get("observacao")),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  };
}

function dataIsoParaUtc(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`);
}

function revalidarRotasRelacionadas() {
  revalidatePath("/administracao");
  revalidatePath("/administracao/calendario");
  revalidatePath("/homologacao");
  revalidatePath("/boletim-frequencia");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
  revalidatePath("/relatorios");
}

export async function atualizarCalendarioInstitucionalAction(
  calendarioId: string,
  _estadoAnterior: CalendarioInstitucionalFormState,
  formData: FormData,
): Promise<CalendarioInstitucionalFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "configuracoes:gerenciar:global",
  );

  const atual = await buscarEventoCalendarioInstitucionalPorId(calendarioId);

  if (!atual) {
    notFound();
  }

  const dados = extrairDadosCalendario(formData);
  const parsed = calendarioInstitucionalSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do calendário institucional.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const dataReferencia = dataIsoParaUtc(parsed.data.dataReferencia);
  const conflito = await buscarEventoCalendarioInstitucionalPorData(
    dataReferencia,
  );

  if (conflito && conflito.id !== atual.id) {
    return {
      sucesso: false,
      mensagem: "Já existe um evento institucional cadastrado para essa data.",
      erros: {
        dataReferencia: [
          "Já existe um evento institucional cadastrado para essa data.",
        ],
      },
      campos: dados,
    };
  }

  const eventoAtualizado = await prisma.$transaction(async (tx) => {
    const eventoAtualizado = await tx.calendarioInstitucional.update({
      where: { id: atual.id },
      data: {
        dataReferencia,
        descricao: parsed.data.descricao,
        tipo: parsed.data.tipo,
        contaComoDiaUtil: parsed.data.contaComoDiaUtil,
        geraApuracaoRegular: parsed.data.geraApuracaoRegular,
        janelaInicio: parsed.data.janelaInicio || null,
        janelaFim: parsed.data.janelaFim || null,
        dataOriginal: parsed.data.dataOriginal
          ? dataIsoParaUtc(parsed.data.dataOriginal)
          : null,
        dataSubstituida: parsed.data.dataSubstituida,
        observacao: parsed.data.observacao || null,
        ativo: parsed.data.ativo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "CalendarioInstitucional",
        entidadeId: eventoAtualizado.id,
        acao: "CALENDARIO_INSTITUCIONAL_ATUALIZADO",
        dadosAntes: atual,
        dadosDepois: eventoAtualizado,
      },
    });

    return eventoAtualizado;
  });

  await enfileirarReflexosCalendarioInstitucional({
    calendarioId: eventoAtualizado.id,
    datasReferencia: [
      atual.dataReferencia,
      eventoAtualizado.dataReferencia,
      ...(atual.dataOriginal ? [atual.dataOriginal] : []),
      ...(eventoAtualizado.dataOriginal ? [eventoAtualizado.dataOriginal] : []),
    ],
    usuarioIdAuditoria: permissao.usuarioId,
  });

  revalidarRotasRelacionadas();
  redirect(`/administracao/calendario/${atual.id}/editar`);
}
