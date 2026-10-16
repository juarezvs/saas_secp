import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";
import type {
  RepositorioExecucaoMct,
  ResultadoExecucaoMctShadow,
} from "../../application/services/executar-mct-shadow.service";

function json(valor: unknown) {
  return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
}

export const mctExecucaoPrismaRepository: RepositorioExecucaoMct = {
  async salvarShadow(resultado: ResultadoExecucaoMctShadow) {
    const chave = {
      orgaoId: resultado.orgaoId,
      servidorId: resultado.servidorId,
      dataReferencia: resultado.dataReferencia,
      politicaVersaoId: resultado.politicaVersaoId,
      hashEntrada: resultado.hashEntrada,
      modo: resultado.modo,
    };
    const existente = await prisma.mctExecucao.findFirst({ where: chave });
    if (existente) return { id: existente.id, criada: false };

    try {
      const execucao = await prisma.mctExecucao.create({
        data: {
          ...chave,
          competencia: resultado.competencia,
          status: resultado.possuiPendencias
            ? "CONCLUIDA_COM_PENDENCIAS"
            : "CONCLUIDA",
          versaoMotor: resultado.versaoMotor,
          entradaSnapshot: json(resultado.entradaSnapshot),
          resultadoJornada: json(resultado.resultadoJornada),
          resultadoConformidade: json(resultado.resultadoConformidade),
          memoriaCalculo: json(resultado.memoriaCalculo),
          finalizadaEm: new Date(),
          eventos: {
            create: resultado.eventos.map((evento) => ({
              eventoIdOrigem: evento.idOrigem ?? evento.id,
              tipo: evento.tipo,
              fonte: evento.fonte,
              ocorridoEm: evento.ocorridoEm,
              duplicadoDe: evento.duplicadoDe ?? null,
            })),
          },
          segmentos: {
            create: resultado.segmentos.map((segmento) => ({
              indice: segmento.indice,
              inicio: segmento.inicio,
              fim: segmento.fim,
              minutos: segmento.minutos,
              marcadores: json(segmento.marcadores),
            })),
          },
          fatos: {
            create: resultado.resultadoConformidade.fatos.map((fato) => ({
              codigo: fato.codigo,
              categoria: fato.categoria,
              minutos: fato.minutos,
              descricao: fato.descricao,
            })),
          },
          rubricas: resultado.classificacao
            ? {
                create: resultado.classificacao.aplicacoes.map((item) => ({
                  rubricaVersaoId: item.rubricaVersaoId,
                  quantidade: item.quantidade,
                  status: item.status,
                  destinacao:
                    item.destinacao === "NENHUM" ? null : item.destinacao,
                  baseIncidencia: json({
                    escopoTemporal: item.escopoTemporal,
                    regraId: item.regraId,
                  }),
                  explicacao: `Rubrica ${item.codigo} aplicada pela regra ${item.regraId}.`,
                })),
              }
            : undefined,
        },
      });
      return { id: execucao.id, criada: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const concorrente = await prisma.mctExecucao.findFirstOrThrow({ where: chave });
        return { id: concorrente.id, criada: false };
      }
      throw error;
    }
  },
};

