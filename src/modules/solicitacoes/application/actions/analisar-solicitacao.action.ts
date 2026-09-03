"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  PeriodoHomologadoError,
  verificarPeriodoHomologado,
} from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import {
  ProcedimentoFrequenciaError,
  validarERegistrarProcedimentoFrequencia,
} from "@/modules/procedimentos-frequencia/application/services/motor-procedimentos-frequencia.service";
import { recalcularPosSolicitacaoService } from "@/modules/recalculo/application/services/recalcular-pos-solicitacao.service";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  buscarSolicitacaoPorId,
  usuarioPodeAcessarSolicitacaoComoChefia,
} from "../../infrastructure/repositories/solicitacao.repository";
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
  string | number | boolean | JsonInputObject | JsonInputArray;

type JsonInputObject = {
  [key: string]: JsonInputValue | null;
};

type JsonInputArray = Array<JsonInputValue | null>;

function normalizarResultadoAnalise(
  valor: FormDataEntryValue | null,
): ResultadoAnalise | undefined {
  const resultado = String(valor ?? "");

  if (
    resultado === "DEFERIR" ||
    resultado === "INDEFERIR" ||
    resultado === "DEVOLVER_AJUSTES"
  ) {
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
  tipo: string;
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
  if (["COMPENSACAO", "FOLGA_BANCO_HORAS"].includes(solicitacao.tipo)) {
    return true;
  }

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

function categoriaProcedimentoSolicitacao(tipo: string) {
  const mapa: Record<
    string,
    | "AJUSTE_BANCO_ABERTO"
    | "COMPENSACAO_SALDO"
    | "CONVERSAO_HORAS_NAO_AUTORIZADAS"
    | "AFASTAMENTO_INFORMATIVO"
    | "TRABALHO_REMOTO"
  > = {
    AJUSTE_PONTO: "AJUSTE_BANCO_ABERTO",
    ABONO_JUSTIFICATIVA: "AJUSTE_BANCO_ABERTO",
    COMPENSACAO: "COMPENSACAO_SALDO",
    FOLGA_BANCO_HORAS: "COMPENSACAO_SALDO",
    HORA_CREDITO_PREVIA: "CONVERSAO_HORAS_NAO_AUTORIZADAS",
    ATIVIDADE_EXTERNA: "AFASTAMENTO_INFORMATIVO",
    VIAGEM_SERVICO: "AFASTAMENTO_INFORMATIVO",
    CAPACITACAO: "AFASTAMENTO_INFORMATIVO",
    DISPENSA_PONTO: "TRABALHO_REMOTO",
  };

  return mapa[tipo] ?? "AJUSTE_BANCO_ABERTO";
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
    const fusoHorario = await resolverFusoHorarioServidorNoBanco({
      servidorId: solicitacao.servidorId,
      dataReferencia:
        solicitacao.dataReferencia ??
        solicitacao.dataInicio ??
        solicitacao.dataFim ??
        undefined,
    });

    for (const dataReferencia of listarDatasImpactadasSolicitacao(
      solicitacao,
      fusoHorario,
    )) {
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
    const ano = data.getUTCFullYear();
    const mes = data.getUTCMonth() + 1;
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

function permissoesParaProcedimentoAnalise(params: {
  permissoes: string[];
  podeConsultarGlobal: boolean;
}) {
  if (!params.podeConsultarGlobal) {
    return params.permissoes;
  }

  return Array.from(
    new Set([...params.permissoes, "solicitacoes:analisar:global"]),
  );
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

  const podeConsultarGlobal = permissoes.includes(
    "solicitacoes:consultar:global",
  );
  const podeAnalisarComoChefia = permissoes.includes(
    "solicitacoes:analisar:chefia",
  );

  if (!podeAnalisarComoChefia && !podeConsultarGlobal) {
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

  if (
    !podeConsultarGlobal &&
    !(await usuarioPodeAcessarSolicitacaoComoChefia({
      usuarioId: session.user.id,
      solicitacaoId,
    }))
  ) {
    return {
      sucesso: false,
      mensagem: "Esta solicitação não pertence aos seus subordinados.",
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
    parsed.data.resultado === "DEFERIR"
      ? "DEFERIDA"
      : parsed.data.resultado === "INDEFERIR"
        ? "INDEFERIDA"
        : "ENVIADA";
  const devolvendoParaAjustes = parsed.data.resultado === "DEVOLVER_AJUSTES";

  if (
    novoStatus === "DEFERIDA" &&
    ["HORA_CREDITO_PREVIA", "COMPENSACAO", "FOLGA_BANCO_HORAS"].includes(
      solicitacaoAtual.tipo,
    ) &&
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

  try {
    await prisma.$transaction(async (tx) => {
    let dadosResultado: JsonInputValue | undefined;

    if (novoStatus === "DEFERIDA") {
      const procedimento =
        await validarERegistrarProcedimentoFrequencia({
          tx,
          categoria: categoriaProcedimentoSolicitacao(solicitacaoAtual.tipo),
          servidorId: solicitacaoAtual.servidorId,
          usuarioId: session.user.id,
          permissoesUsuario: permissoesParaProcedimentoAnalise({
            permissoes,
            podeConsultarGlobal,
          }),
          dataInicio:
            solicitacaoAtual.dataInicio ??
            solicitacaoAtual.dataReferencia ??
            null,
          dataFim: solicitacaoAtual.dataFim ?? solicitacaoAtual.dataInicio,
          justificativa: parsed.data.justificativaAnalise,
          titulo: `Análise da solicitação ${solicitacaoAtual.tipo}`,
          aplicar: true,
          exigePermissao: "autorizar",
          exigeRecalculo: deveRecalcularPosDeferimento(solicitacaoAtual.tipo),
          validarDocumentos: false,
          dadosEntrada: {
            origem: "SOLICITACAO_PONTO",
            solicitacaoId: solicitacaoAtual.id,
            tipo: solicitacaoAtual.tipo,
            dataReferencia: solicitacaoAtual.dataReferencia,
            dataInicio: solicitacaoAtual.dataInicio,
            dataFim: solicitacaoAtual.dataFim,
          },
        });
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
      dadosResultado = converterParaJsonInput({
        ...(dadosResultado &&
        typeof dadosResultado === "object" &&
        !Array.isArray(dadosResultado)
          ? dadosResultado
          : { efeito: dadosResultado ?? null }),
        procedimentoFrequenciaId: procedimento.procedimento.id,
        procedimentoFrequenciaExecucaoId: procedimento.execucao?.id ?? null,
        procedimentoFrequenciaCodigo: procedimento.procedimento.codigo,
      });

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
        analisadaPorUsuarioId: devolvendoParaAjustes ? null : session.user.id,
        analisadaEm: devolvendoParaAjustes ? null : new Date(),
        justificativaAnalise: parsed.data.justificativaAnalise,
        dadosResultado,
      },
    });

    await tx.solicitacaoEvento.create({
      data: {
        solicitacaoId,
        usuarioId: session.user.id,
        tipo:
          novoStatus === "DEFERIDA"
            ? "DEFERIDA"
            : novoStatus === "INDEFERIDA"
              ? "INDEFERIDA"
              : "COMENTARIO",
        descricao:
          novoStatus === "DEFERIDA"
            ? "Solicitacao deferida pela chefia."
            : novoStatus === "INDEFERIDA"
              ? "Solicitacao indeferida pela chefia."
              : "Solicitacao devolvida para ajustes pela chefia.",
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
            : novoStatus === "INDEFERIDA"
              ? "SOLICITACAO_INDEFERIDA"
              : "SOLICITACAO_DEVOLVIDA_AJUSTES",
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
  } catch (error) {
    if (error instanceof ProcedimentoFrequenciaError) {
      return {
        sucesso: false,
        mensagem: error.message,
        campos: parsed.data,
      };
    }

    throw error;
  }

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
        ? "Solicitacao deferida e recalculo executado com sucesso."
        : novoStatus === "INDEFERIDA"
          ? "Solicitacao indeferida com sucesso."
          : "Solicitacao devolvida para ajustes com sucesso.",
  };
}
