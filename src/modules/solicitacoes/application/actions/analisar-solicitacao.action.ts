"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  PeriodoHomologadoError,
  verificarPeriodoHomologado,
} from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { recalcularPosSolicitacaoService } from "@/modules/recalculo/application/services/recalcular-pos-solicitacao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { buscarSolicitacaoPorId } from "../../infrastructure/repositories/solicitacao.repository";
import {
  analisarSolicitacaoSchema,
  type AnalisarSolicitacaoFormState,
  type AnalisarSolicitacaoInput,
} from "../schemas/solicitacao.schema";
import { aplicarEfeitosSolicitacaoDeferida } from "../services/aplicar-efeitos-solicitacao.service";
import {
  listarDatasImpactadasSolicitacao,
  TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO,
} from "../services/periodo-solicitacao.service";

type ResultadoAnalise = AnalisarSolicitacaoInput["resultado"];

type JsonInputValue =
  | string
  | number
  | boolean
  | JsonInputObject
  | JsonInputArray;

type JsonInputObject = {
  [key: string]: JsonInputValue | null;
};

type JsonInputArray = Array<JsonInputValue | null>;

function normalizarResultadoAnalise(
  valor: FormDataEntryValue | null,
): ResultadoAnalise | undefined {
  const resultado = String(valor ?? "");

  if (resultado === "DEFERIR" || resultado === "INDEFERIR") {
    return resultado;
  }

  return undefined;
}

function converterParaJsonInput(valor: unknown): JsonInputValue | undefined {
  if (valor === null || valor === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(valor)) as JsonInputValue;
}

function extrairDados(formData: FormData): Partial<AnalisarSolicitacaoInput> {
  return {
    resultado: normalizarResultadoAnalise(formData.get("resultado")),
    justificativaAnalise: String(
      formData.get("justificativaAnalise") ?? "",
    ).trim(),
  };
}

function possuiDadosAutorizacaoBancoHoras(solicitacao: {
  dataInicio: Date | null;
  dataFim: Date | null;
  dadosSolicitados: unknown;
}) {
  if (
    !solicitacao.dataInicio ||
    !solicitacao.dataFim ||
    !solicitacao.dadosSolicitados ||
    typeof solicitacao.dadosSolicitados !== "object"
  ) {
    return false;
  }

  const dados = solicitacao.dadosSolicitados as Record<string, unknown>;
  const minutosSolicitados = Number(dados.minutosSolicitados);

  return Number.isInteger(minutosSolicitados) && minutosSolicitados > 0;
}

function deveRecalcularPosDeferimento(tipo: string) {
  return TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO.includes(
    tipo as (typeof TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO)[number],
  );
}

function deveRecalcularApuracaoDiaria(tipo: string) {
  return deveRecalcularPosDeferimento(tipo);
}

async function validarPeriodosImpactadosAbertos(solicitacao: {
  servidorId: string;
  tipo: string;
  dataReferencia: Date | null;
  dataInicio: Date | null;
  dataFim: Date | null;
}) {
  if (!deveRecalcularApuracaoDiaria(solicitacao.tipo)) {
    return null;
  }

  try {
    for (const dataReferencia of listarDatasImpactadasSolicitacao(solicitacao)) {
      await verificarPeriodoHomologado({
        servidorId: solicitacao.servidorId,
        dataReferencia,
      });
    }
  } catch (error) {
    if (error instanceof PeriodoHomologadoError) {
      return `A competencia ${String(error.mesReferencia).padStart(
        2,
        "0",
      )}/${error.anoReferencia} ja foi homologada. Reabra o periodo antes de deferir uma solicitacao que altera o espelho de ponto.`;
    }

    throw error;
  }

  return null;
}

function revalidarCompetenciasDoEspelho(params: {
  servidorId: string;
  datasImpactadas?: Date[];
  resultadosBanco?: Array<{ anoReferencia: number; mesReferencia: number }>;
}) {
  const competencias = new Map<string, string>();

  for (const data of params.datasImpactadas ?? []) {
    const ano = data.getFullYear();
    const mes = data.getMonth() + 1;
    competencias.set(`${ano}-${mes}`, `${ano}-${String(mes).padStart(2, "0")}`);
  }

  for (const item of params.resultadosBanco ?? []) {
    competencias.set(
      `${item.anoReferencia}-${item.mesReferencia}`,
      `${item.anoReferencia}-${String(item.mesReferencia).padStart(2, "0")}`,
    );
  }

  for (const competencia of competencias.values()) {
    revalidatePath(
      `/espelho-ponto?servidorId=${params.servidorId}&competencia=${competencia}`,
    );
  }
}

export async function analisarSolicitacaoAction(
  solicitacaoId: string,
  _estadoAnterior: AnalisarSolicitacaoFormState,
  formData: FormData,
): Promise<AnalisarSolicitacaoFormState> {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessão expirada. Faça login novamente.",
    };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeAnalisar =
    permissoes.includes("solicitacoes:analisar:chefia") ||
    permissoes.includes("solicitacoes:consultar:global");

  if (!podeAnalisar) {
    return {
      sucesso: false,
      mensagem: "Você não possui permissão para analisar solicitações.",
    };
  }

  const solicitacaoAtual = await buscarSolicitacaoPorId(solicitacaoId);

  if (!solicitacaoAtual) {
    return {
      sucesso: false,
      mensagem: "Solicitação não encontrada.",
    };
  }

  if (!["ENVIADA", "EM_ANALISE"].includes(solicitacaoAtual.status)) {
    return {
      sucesso: false,
      mensagem: "Esta solicitação não pode mais ser analisada.",
    };
  }

  const dados = extrairDados(formData);
  const parsed = analisarSolicitacaoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique a análise da solicitação.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const novoStatus =
    parsed.data.resultado === "DEFERIR" ? "DEFERIDA" : "INDEFERIDA";

  if (
    novoStatus === "DEFERIDA" &&
    ["HORA_CREDITO_PREVIA", "COMPENSACAO"].includes(solicitacaoAtual.tipo) &&
    !possuiDadosAutorizacaoBancoHoras(solicitacaoAtual)
  ) {
    return {
      sucesso: false,
      mensagem:
        "A solicitação não possui período e quantidade válidos para registrar a autorização prévia.",
      campos: parsed.data,
    };
  }

  if (novoStatus === "DEFERIDA") {
    const mensagemPeriodoBloqueado =
      await validarPeriodosImpactadosAbertos(solicitacaoAtual);

    if (mensagemPeriodoBloqueado) {
      return {
        sucesso: false,
        mensagem: mensagemPeriodoBloqueado,
        campos: parsed.data,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    let dadosResultado: JsonInputValue | undefined;

    if (novoStatus === "DEFERIDA") {
      const efeito = await aplicarEfeitosSolicitacaoDeferida({
        tx,
        usuarioAnaliseId: session.user.id,
        solicitacao: {
          id: solicitacaoAtual.id,
          servidorId: solicitacaoAtual.servidorId,
          usuarioSolicitanteId: solicitacaoAtual.usuarioSolicitanteId,
          tipo: solicitacaoAtual.tipo,
          dataReferencia: solicitacaoAtual.dataReferencia,
          dataInicio: solicitacaoAtual.dataInicio,
          dataFim: solicitacaoAtual.dataFim,
          dadosSolicitados: solicitacaoAtual.dadosSolicitados,
        },
        justificativaAnalise: parsed.data.justificativaAnalise,
      });

      dadosResultado = converterParaJsonInput(efeito);

      await tx.solicitacaoEvento.create({
        data: {
          solicitacaoId,
          usuarioId: session.user.id,
          tipo: "EFEITO_APLICADO",
          descricao: efeito.mensagem,
          metadados: dadosResultado ?? {},
        },
      });
    }

    await tx.solicitacao.update({
      where: {
        id: solicitacaoId,
      },
      data: {
        status: novoStatus,
        analisadaPorUsuarioId: session.user.id,
        analisadaEm: new Date(),
        justificativaAnalise: parsed.data.justificativaAnalise,
        dadosResultado,
      },
    });

    await tx.solicitacaoEvento.create({
      data: {
        solicitacaoId,
        usuarioId: session.user.id,
        tipo: novoStatus === "DEFERIDA" ? "DEFERIDA" : "INDEFERIDA",
        descricao:
          novoStatus === "DEFERIDA"
            ? "Solicitação deferida pela chefia."
            : "Solicitação indeferida pela chefia.",
        metadados: {
          justificativaAnalise: parsed.data.justificativaAnalise,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "Solicitacao",
        entidadeId: solicitacaoId,
        acao:
          novoStatus === "DEFERIDA"
            ? "SOLICITACAO_DEFERIDA"
            : "SOLICITACAO_INDEFERIDA",
        dadosAntes: {
          status: solicitacaoAtual.status,
        },
        dadosDepois: {
          status: novoStatus,
          justificativaAnalise: parsed.data.justificativaAnalise,
          dadosResultado: dadosResultado ?? null,
        },
      },
    });
  });

  const resultadoRecalculo =
    novoStatus === "DEFERIDA" &&
    deveRecalcularPosDeferimento(solicitacaoAtual.tipo)
      ? await recalcularPosSolicitacaoService({
          solicitacaoId,
          usuarioIdAuditoria: session.user.id,
        })
      : null;

  revalidatePath("/solicitacoes");
  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  revalidatePath("/marcacoes");
  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");

  if (resultadoRecalculo?.sucesso) {
    revalidarCompetenciasDoEspelho({
      servidorId: solicitacaoAtual.servidorId,
      datasImpactadas: resultadoRecalculo.datasImpactadas,
      resultadosBanco: resultadoRecalculo.resultadosBanco,
    });
  }

  return {
    sucesso: true,
    mensagem:
      novoStatus === "DEFERIDA"
        ? "Solicitação deferida e recálculo executado com sucesso."
        : "Solicitação indeferida com sucesso.",
  };
}
