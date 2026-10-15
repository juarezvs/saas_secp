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

export async function simularJornadaMct(input: EntradaSimulacaoMct) {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar([
    "mct-simulador:usar:seccional",
    "mct-simulador:usar:global",
  ]);
  const dataReferencia = new Date(`${input.data}T00:00:00.000Z`);
  if (!input.jornadaId || !Number.isFinite(dataReferencia.getTime()))
    throw new Error("Informe jornada e data válidas.");
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
  if (!jornada) throw new Error("Jornada não encontrada.");
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
  if (!associacao?.politica || associacao.politica.estado !== "PUBLICADA")
    throw new Error(
      "A jornada ainda não possui configuração MCT simulável com política publicada para esta seccional.",
    );
  validarEscopo(associacao.orgaoId, acesso);
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
  const politica = associacao.politica;
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
    orgaoId: associacao.orgaoId,
    politicaVersaoId: politica.id,
    dataReferencia,
  });
  const retorno = await executarMctShadow({
    orgaoId: associacao.orgaoId,
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
        id: associacao.id,
        modeloCodigo: associacao.modeloCodigo,
        status: associacao.status,
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
