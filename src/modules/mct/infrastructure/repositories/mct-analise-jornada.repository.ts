import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";
import type { AnaliseJornadaMctDto } from "../../application/dtos/analise-jornada.dto";

function extrairReferencia(entradaSnapshot: unknown) {
  if (!entradaSnapshot || typeof entradaSnapshot !== "object") return null;
  const politica = (entradaSnapshot as Record<string, unknown>).politica;
  if (!politica || typeof politica !== "object") return null;
  const referencia = (politica as Record<string, unknown>).referencia;
  if (!referencia || typeof referencia !== "object") return null;
  const { inicio, fim } = referencia as Record<string, unknown>;
  return typeof inicio === "string" && typeof fim === "string"
    ? { entrada: inicio, saida: fim }
    : null;
}

function extrairFusoHorario(entradaSnapshot: unknown) {
  if (!entradaSnapshot || typeof entradaSnapshot !== "object")
    return "America/Manaus";
  const politica = (entradaSnapshot as Record<string, unknown>).politica;
  if (!politica || typeof politica !== "object") return "America/Manaus";
  const fusoHorario = (politica as Record<string, unknown>).fusoHorario;
  return typeof fusoHorario === "string" ? fusoHorario : "America/Manaus";
}

export async function listarAnalisesJornadaMctNoMes(params: {
  orgaoId: string;
  servidorId: string;
  ano: number;
  mes: number;
}): Promise<Record<string, AnaliseJornadaMctDto>> {
  const inicio = new Date(Date.UTC(params.ano, params.mes - 1, 1));
  const fim = new Date(Date.UTC(params.ano, params.mes, 1));
  const execucoes = await prismaListagem.mctExecucao.findMany({
    where: {
      orgaoId: params.orgaoId,
      servidorId: params.servidorId,
      dataReferencia: { gte: inicio, lt: fim },
      modo: { in: ["SHADOW", "MCT"] },
      status: { in: ["CONCLUIDA", "CONCLUIDA_COM_PENDENCIAS"] },
    },
    orderBy: [{ dataReferencia: "asc" }, { iniciadaEm: "desc" }],
    include: {
      politica: { select: { codigo: true, nome: true, versao: true } },
      eventos: { orderBy: { ocorridoEm: "asc" } },
      segmentos: { orderBy: { indice: "asc" } },
      fatos: { orderBy: { codigo: "asc" } },
      rubricas: {
        include: {
          rubrica: {
            select: {
              codigo: true,
              nome: true,
              dimensao: true,
              fundamentoNormativo: true,
            },
          },
        },
      },
      comparacaoLegado: true,
    },
  });

  const resultado = execucoes.reduce<Record<string, AnaliseJornadaMctDto>>(
    (analises, execucao) => {
      const data = execucao.dataReferencia.toISOString().slice(0, 10);
      if (analises[data]) return analises;

      analises[data] = {
        execucaoId: execucao.id,
        dataReferencia: data,
        modo: execucao.modo,
        status: execucao.status,
        versaoMotor: execucao.versaoMotor,
        iniciadaEm: execucao.iniciadaEm.toISOString(),
        finalizadaEm: execucao.finalizadaEm?.toISOString() ?? null,
        duracaoMs: execucao.duracaoMs,
        referencia: extrairReferencia(execucao.entradaSnapshot),
        fusoHorario: extrairFusoHorario(execucao.entradaSnapshot),
        politica: execucao.politica,
        resultadoJornada: execucao.resultadoJornada,
        resultadoConformidade: execucao.resultadoConformidade,
        memoriaCalculo: execucao.memoriaCalculo,
        eventos: execucao.eventos.map((evento) => ({
          id: evento.id,
          tipo: evento.tipo,
          fonte: evento.fonte,
          ocorridoEm: evento.ocorridoEm.toISOString(),
          duplicadoDe: evento.duplicadoDe,
        })),
        segmentos: execucao.segmentos.map((segmento) => ({
          id: segmento.id,
          indice: segmento.indice,
          inicio: segmento.inicio.toISOString(),
          fim: segmento.fim.toISOString(),
          minutos: segmento.minutos,
          marcadores: segmento.marcadores,
        })),
        fatos: execucao.fatos.map((fato) => ({
          id: fato.id,
          codigo: fato.codigo,
          categoria: fato.categoria,
          minutos: fato.minutos,
          descricao: fato.descricao,
        })),
        rubricas: execucao.rubricas.map((aplicacao) => ({
          id: aplicacao.id,
          codigo: aplicacao.rubrica.codigo,
          nome: aplicacao.rubrica.nome,
          dimensao: aplicacao.rubrica.dimensao,
          quantidade: aplicacao.quantidade,
          status: aplicacao.status,
          destinacao: aplicacao.destinacao,
          explicacao: aplicacao.explicacao,
          baseIncidencia: aplicacao.baseIncidencia,
          fundamentoNormativo: aplicacao.rubrica.fundamentoNormativo,
        })),
        comparacaoLegado: execucao.comparacaoLegado
          ? {
              totalDivergencias: execucao.comparacaoLegado.totalDivergencias,
              possuiDivergenciaCritica:
                execucao.comparacaoLegado.possuiDivergenciaCritica,
              divergencias: execucao.comparacaoLegado.divergencias,
              comparadoEm: execucao.comparacaoLegado.comparadoEm.toISOString(),
            }
          : null,
        historico: [],
      };
      return analises;
    },
    {},
  );

  for (const execucao of execucoes) {
    const data = execucao.dataReferencia.toISOString().slice(0, 10);
    const analise = resultado[data];
    if (!analise || execucao.id === analise.execucaoId) continue;
    analise.historico.push({
      execucaoId: execucao.id,
      status: execucao.status,
      versaoMotor: execucao.versaoMotor,
      iniciadaEm: execucao.iniciadaEm.toISOString(),
      finalizadaEm: execucao.finalizadaEm?.toISOString() ?? null,
    });
  }

  return resultado;
}
