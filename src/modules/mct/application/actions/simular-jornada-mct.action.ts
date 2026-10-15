"use server";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { resolverPrevisaoJornadaDia } from "@/modules/jornadas/application/services/resolver-previsao-jornada-dia.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import type { EventoTemporal } from "../../domain/mct.types";
import { carregarClassificacaoMct } from "../services/carregar-classificacao-mct.service";
import { executarMctShadow } from "../services/executar-mct-shadow.service";

export type EntradaSimulacaoMct = {
  jornadaId: string;
  escalaId?: string;
  configuracaoId?: string;
  data: string;
  marcacoes: string;
  ocorrencias?: string;
  autorizacoes?: string;
  legado?: {
    cargaPrevistaMinutos: number;
    minutosTrabalhados: number;
    minutosCredito: number;
    minutosDebito: number;
  };
};

function validarEscopo(
  orgaoId: string,
  acesso: { perfilAtivoEscopoGlobal?: boolean; orgaoIds?: string[] },
) {
  if (!acesso.perfilAtivoEscopoGlobal && !acesso.orgaoIds?.includes(orgaoId))
    throw new Error("A jornada não pertence ao escopo do perfil ativo.");
}

async function executarSimulacaoJornadaMct(input: EntradaSimulacaoMct) {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar([
    "mct-simulador:usar:seccional",
    "mct-simulador:usar:global",
  ]);
  const dataReferencia = new Date(`${input.data}T00:00:00.000Z`);
  if (!input.jornadaId || !Number.isFinite(dataReferencia.getTime()))
    throw new Error("Informe o horário de trabalho e uma data válida.");
  const jornada = await prisma.jornada.findUnique({
    where: { id: input.jornadaId },
    include: {
      dias: { include: { faixas: true } },
      escalas: {
        where: input.escalaId ? { id: input.escalaId } : { ativo: true },
        include: { dias: true },
        take: 1,
      },
    },
  });
  if (!jornada) throw new Error("Horário de trabalho não encontrado.");
  const escala = jornada.escalas[0] ?? null;
  const associacoes = await prisma.mctConfiguracaoApuracao.findMany({
    where: {
      ...(input.configuracaoId ? { id: input.configuracaoId } : {}),
      ...(!acesso.perfilAtivoEscopoGlobal
        ? {
            orgaoId: {
              in: acesso.orgaoIds?.length
                ? acesso.orgaoIds
                : ["00000000-0000-0000-0000-000000000000"],
            },
          }
        : {}),
      jornadaId: jornada.id,
      status: { in: ["PRONTA_SIMULACAO", "EM_VALIDACAO", "ATIVA"] },
      vigenciaInicio: { lte: dataReferencia },
      OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: dataReferencia } }],
      AND: [{ OR: [{ escalaId: escala?.id ?? null }, { escalaId: null }] }],
    },
    include: { politica: true },
    orderBy: [{ escalaId: "desc" }, { criadoEm: "desc" }],
  });
  const associacao = input.configuracaoId
    ? associacoes[0]
    : (associacoes.find((item) => item.status === "ATIVA") ??
      associacoes.find((item) => item.status === "EM_VALIDACAO") ??
      associacoes[0]);
  const orgaoId =
    associacao?.orgaoId ??
    jornada.orgaoId ??
    (!acesso.perfilAtivoEscopoGlobal && acesso.orgaoIds?.length === 1
      ? acesso.orgaoIds[0]
      : null);
  if (!orgaoId)
    throw new Error(
      "Não foi possível determinar a seccional da simulação. Crie uma configuração MCT para este horário de trabalho.",
    );
  validarEscopo(orgaoId, acesso);
  const politicaAssociada =
    associacao?.politica?.estado === "PUBLICADA" ? associacao.politica : null;
  const politicaPadrao = politicaAssociada
    ? null
    : await prisma.mctPoliticaVersao.findFirst({
        where: {
          orgaoId,
          estado: "PUBLICADA",
          vigenciaInicio: { lte: dataReferencia },
          OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: dataReferencia } }],
        },
        orderBy: [{ codigo: "asc" }, { versao: "desc" }],
      });
  const politica = politicaAssociada ?? politicaPadrao;
  if (!politica)
    throw new Error(
      "Não existe política MCT publicada e vigente para esta seccional e data.",
    );
  const previsao = resolverPrevisaoJornadaDia({
    jornada,
    escala,
    dataReferencia,
  });
  const horarios = input.marcacoes
    .split(/[;,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!horarios.length) throw new Error("Informe ao menos uma marcação.");
  const eventos: EventoTemporal[] = horarios.map((hora, indice) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))
      throw new Error(`Marcação inválida: ${hora}.`);
    const [h, m] = hora.split(":").map(Number);
    return {
      id: `simulacao-${indice}`,
      ocorridoEm: new Date(
        Date.UTC(
          dataReferencia.getUTCFullYear(),
          dataReferencia.getUTCMonth(),
          dataReferencia.getUTCDate(),
          h,
          m,
        ),
      ),
      tipo: indice % 2 === 0 ? "ENTRADA" : "SAIDA",
      fonte: "SIMULADOR",
    };
  });
  const parametros = politica.configuracao as Record<string, unknown>;
  const autorizacoes =
    input.autorizacoes
      ?.split(/[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  const ocorrencias =
    input.ocorrencias
      ?.split(/[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  const classificacaoBase = await carregarClassificacaoMct({
    orgaoId,
    politicaVersaoId: politica.id,
    dataReferencia,
  });
  const retorno = await executarMctShadow({
    orgaoId,
    servidorId: "00000000-0000-0000-0000-000000000000",
    dataReferencia,
    politica: {
      id: politica.id,
      versao: politica.versao,
      orgaoId: politica.orgaoId,
      vigenciaInicio: politica.vigenciaInicio,
      vigenciaFim: politica.vigenciaFim,
      cargaExigivelMinutos: previsao.cargaPrevistaMinutos,
      intervaloMinimoMinutos: jornada.exigeIntervalo
        ? jornada.intervaloMinimoMinutos
        : null,
      intervaloMaximoMinutos: jornada.exigeIntervalo
        ? jornada.intervaloMaximoMinutos
        : null,
      flexibilidadeEntradaMinutos: Number(
        parametros.flexibilidadeEntradaMinutos ?? 0,
      ),
      flexibilidadeSaidaMinutos: Number(
        parametros.flexibilidadeSaidaMinutos ?? 0,
      ),
      permiteCompensacaoNoDia: jornada.permiteCompensacaoNoDia,
    },
    plano: {
      dataReferencia,
      trabalha: previsao.trabalha,
      jornadaPrevistaMinutos: previsao.cargaPrevistaMinutos,
      jornadaExigivelMinutos: previsao.cargaPrevistaMinutos,
      minutosReconhecidosComoExercicio: 0,
      posicaoCiclo: previsao.escalaPosicaoCiclo,
      codigoDiaCiclo: previsao.escalaPosicaoCiclo
        ? String(previsao.escalaPosicaoCiclo)
        : null,
      ocorrenciasAplicadas: ocorrencias,
    },
    eventos,
    classificacao: {
      ...classificacaoBase,
      autorizacoes,
      contexto: {
        possuiAutorizacao: autorizacoes.length > 0,
        possuiOcorrencia: ocorrencias.length > 0,
      },
    },
  });
  return JSON.parse(
    JSON.stringify({
      simulacao: true,
      efeitoOficial: false,
      configuracao: {
        id: associacao?.id ?? null,
        modeloCodigo: associacao?.modeloCodigo ?? "SIMULACAO_PADRAO",
        status: associacao?.status ?? "TEMPORARIA",
        provisoria: !associacao,
      },
      politica: {
        id: politica.id,
        codigo: politica.codigo,
        nome: politica.nome,
        versao: politica.versao,
      },
      referencia: previsao.janela
        ? {
            entrada: previsao.janela.inicio,
            saida: previsao.janela.fim,
          }
        : null,
      resultado: retorno.resultado,
    }),
  );
}

export async function simularJornadaMct(input: EntradaSimulacaoMct) {
  try {
    return {
      sucesso: true as const,
      dados: await executarSimulacaoJornadaMct(input),
    };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "";
    const erroEsperado = [
      "Informe ",
      "Horário de trabalho ",
      "A jornada ",
      "Marcação inválida:",
      "Não foi possível determinar ",
      "Não existe política ",
    ].some((inicio) => mensagem.startsWith(inicio));
    return {
      sucesso: false as const,
      mensagem: erroEsperado
        ? mensagem
        : "Não foi possível concluir a simulação. Tente novamente.",
    };
  }
}
