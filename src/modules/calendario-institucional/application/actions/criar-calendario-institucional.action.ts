"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { buscarEventoCalendarioInstitucionalPorData } from "../../infrastructure/repositories/calendario-institucional.repository";
import {
  calendarioInstitucionalSchema,
  type CalendarioInstitucionalFormState,
  type CalendarioInstitucionalInput,
} from "../schemas/calendario-institucional.schema";

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
}

export async function criarCalendarioInstitucionalAction(
  _estadoAnterior: CalendarioInstitucionalFormState,
  formData: FormData,
): Promise<CalendarioInstitucionalFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "configuracoes:gerenciar:global",
  );

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
  const existente = await buscarEventoCalendarioInstitucionalPorData(
    dataReferencia,
  );

  if (existente) {
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

  const evento = await prisma.$transaction(async (tx) => {
    const novoEvento = await tx.calendarioInstitucional.create({
      data: {
        dataReferencia,
        descricao: parsed.data.descricao,
        tipo: parsed.data.tipo,
        contaComoDiaUtil: parsed.data.contaComoDiaUtil,
        geraApuracaoRegular: parsed.data.geraApuracaoRegular,
        observacao: parsed.data.observacao || null,
        ativo: parsed.data.ativo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "CalendarioInstitucional",
        entidadeId: novoEvento.id,
        acao: "CALENDARIO_INSTITUCIONAL_CRIADO",
        dadosDepois: novoEvento,
      },
    });

    return novoEvento;
  });

  revalidarRotasRelacionadas();
  redirect(`/administracao/calendario/${evento.id}/editar`);
}
