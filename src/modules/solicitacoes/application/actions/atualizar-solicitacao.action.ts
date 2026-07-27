"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { dataHoraLocalParaUtc } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { resolverFusoHorarioServidor } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  criarSolicitacaoSchema,
  tiposSolicitacao,
  type CriarSolicitacaoFormState,
  type CriarSolicitacaoInput,
} from "../schemas/solicitacao.schema";

type TipoSolicitacao = CriarSolicitacaoInput["tipo"];

function normalizarTipoSolicitacao(
  valor: FormDataEntryValue | null,
): TipoSolicitacao | undefined {
  const tipo = String(valor ?? "");

  return tiposSolicitacao.includes(tipo as TipoSolicitacao)
    ? (tipo as TipoSolicitacao)
    : undefined;
}

function dataReferenciaFormulario(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`);
}

function valorOpcionalData(valor: string | undefined) {
  if (!valor) return null;
  return new Date(`${valor}T00:00:00`);
}

function proximaDataReferenciaFormulario(valor: string) {
  const data = dataReferenciaFormulario(valor);
  data.setUTCDate(data.getUTCDate() + 1);
  return data;
}

function valorOpcionalDateTime(
  valor: string | undefined,
  fusoHorario?: string | null,
) {
  if (!valor) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return dataHoraLocalParaUtc({
      dataReferencia: dataReferenciaFormulario(valor),
      hora: "00:00",
      fusoHorario,
    });
  }

  const [data, hora = "00:00"] = valor.split("T");

  return dataHoraLocalParaUtc({
    dataReferencia: dataReferenciaFormulario(data),
    hora,
    fusoHorario,
  });
}

function valorOpcionalFimPeriodo(
  valor: string | undefined,
  fusoHorario?: string | null,
) {
  if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return dataHoraLocalParaUtc({
      dataReferencia: proximaDataReferenciaFormulario(valor),
      hora: "00:00",
      fusoHorario,
    });
  }

  return valorOpcionalDateTime(valor, fusoHorario);
}

function extrairDados(formData: FormData): Partial<CriarSolicitacaoInput> {
  return {
    tipo: normalizarTipoSolicitacao(formData.get("tipo")),
    titulo: String(formData.get("titulo") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    dataReferencia: String(formData.get("dataReferencia") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataFim: String(formData.get("dataFim") ?? ""),
    tipoMarcacao: String(formData.get("tipoMarcacao") ?? ""),
    horaAjuste: String(formData.get("horaAjuste") ?? ""),
    tipoCompensacao: String(formData.get("tipoCompensacao") ?? "") as
      CriarSolicitacaoInput["tipoCompensacao"] | "",
    horasSolicitadas: formData.get("horasSolicitadas")
      ? Number(formData.get("horasSolicitadas"))
      : undefined,
    regimeTrabalhoRemotoTipo: String(
      formData.get("regimeTrabalhoRemotoTipo") ?? "NAO_SE_APLICA",
    ) as CriarSolicitacaoInput["regimeTrabalhoRemotoTipo"],
    diasRemotos: formData
      .getAll("diasRemotos")
      .map((valor) => String(valor)) as CriarSolicitacaoInput["diasRemotos"],
    modalidadeCapacitacao: String(
      formData.get("modalidadeCapacitacao") ?? "",
    ) as CriarSolicitacaoInput["modalidadeCapacitacao"],
  };
}

export async function atualizarSolicitacaoAction(
  _estadoAnterior: CriarSolicitacaoFormState,
  formData: FormData,
): Promise<CriarSolicitacaoFormState> {
  const solicitacaoId = String(formData.get("solicitacaoId") ?? "");
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessao expirada. Faca login novamente.",
    };
  }

  const dados = extrairDados(formData);
  const parsed = criarSolicitacaoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos da solicitacao.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const solicitacao = await prisma.solicitacao.findUnique({
    where: { id: solicitacaoId },
    include: {
      servidor: {
        include: {
          usuario: true,
          lotacoes: {
            where: { status: "ATIVO" },
            include: {
              unidade: {
                include: {
                  orgao: true,
                  unidadePai: { include: { orgao: true } },
                },
              },
            },
            orderBy: { dataInicio: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!solicitacao || solicitacao.usuarioSolicitanteId !== session.user.id) {
    return {
      sucesso: false,
      mensagem: "Solicitacao nao encontrada para o usuario autenticado.",
      campos: dados,
    };
  }

  if (!["ENVIADA", "EM_ANALISE"].includes(solicitacao.status)) {
    return {
      sucesso: false,
      mensagem: "Apenas solicitacoes ainda nao concluídas podem ser editadas.",
      campos: dados,
    };
  }

  const fusoHorario = resolverFusoHorarioServidor(solicitacao.servidor);
  const dataReferencia = valorOpcionalData(parsed.data.dataReferencia);
  const dataInicio = valorOpcionalDateTime(parsed.data.dataInicio, fusoHorario);
  const dataFim = valorOpcionalFimPeriodo(parsed.data.dataFim, fusoHorario);

  await prisma.$transaction(async (tx) => {
    await tx.solicitacao.update({
      where: { id: solicitacao.id },
      data: {
        tipo: parsed.data.tipo,
        titulo: parsed.data.titulo,
        descricao: parsed.data.descricao,
        dataReferencia,
        dataInicio,
        dataFim,
        dadosSolicitados: {
          tipoMarcacao: parsed.data.tipoMarcacao || null,
          horaAjuste: parsed.data.horaAjuste || null,
          tipoCompensacao: parsed.data.tipoCompensacao || null,
          horasSolicitadas: parsed.data.horasSolicitadas ?? null,
          minutosSolicitados: parsed.data.horasSolicitadas
            ? Math.round(parsed.data.horasSolicitadas * 60)
            : null,
          modalidadeCapacitacao:
            parsed.data.tipo === "CAPACITACAO"
              ? parsed.data.modalidadeCapacitacao
              : null,
          regimeTrabalhoRemoto:
            parsed.data.tipo === "DISPENSA_PONTO" &&
            parsed.data.regimeTrabalhoRemotoTipo !== "NAO_SE_APLICA"
              ? {
                  tipo: parsed.data.regimeTrabalhoRemotoTipo,
                  diasRemotos:
                    parsed.data.regimeTrabalhoRemotoTipo === "TOTAL"
                      ? []
                      : parsed.data.diasRemotos,
                }
              : null,
        },
      },
    });

    await tx.solicitacaoEvento.create({
      data: {
        solicitacaoId: solicitacao.id,
        usuarioId: session.user.id,
        tipo: "COMENTARIO",
        descricao: "Solicitacao editada pelo solicitante.",
      },
    });
  });

  revalidatePath("/solicitacoes");
  revalidatePath(`/solicitacoes/${solicitacao.id}`);
  redirect(`/solicitacoes/${solicitacao.id}`);
}
