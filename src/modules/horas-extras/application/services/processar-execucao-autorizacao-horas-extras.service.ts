import type { CategoriaClassificacaoHoraExtra } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  classificarExecucaoHorasExtras,
  type AutorizacaoHoraExtraClassificacao,
  type CategoriaIntervaloHoraExtra,
  type IntervaloTrabalhoHoraExtra,
} from "./classificar-execucao-horas-extras.service";

function dataIso(data: Date) {
  return data.toISOString().slice(0, 10);
}

function dataUtc(data: string) {
  return new Date(`${data}T00:00:00.000Z`);
}

function formatarHora(data: Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(data);
}

function minutosEntre(inicio: string, fim: string) {
  const [inicioHora, inicioMinuto] = inicio.split(":").map(Number);
  const [fimHora, fimMinuto] = fim.split(":").map(Number);

  return fimHora * 60 + fimMinuto - (inicioHora * 60 + inicioMinuto);
}

function converterCategoria(
  categoria: CategoriaIntervaloHoraExtra,
): CategoriaClassificacaoHoraExtra {
  return categoria;
}

function construirIntervalos(
  marcacoes: Array<{
    id: string;
    dataHora: Date;
    dataReferencia: Date;
    fusoHorario: string;
  }>,
) {
  const intervalos: IntervaloTrabalhoHoraExtra[] = [];
  const marcacoesOrdenadas = [...marcacoes].sort(
    (a, b) => a.dataHora.getTime() - b.dataHora.getTime(),
  );

  for (let index = 0; index + 1 < marcacoesOrdenadas.length; index += 2) {
    const entrada = marcacoesOrdenadas[index];
    const saida = marcacoesOrdenadas[index + 1];
    const inicio = formatarHora(entrada.dataHora, entrada.fusoHorario);
    const fim = formatarHora(saida.dataHora, saida.fusoHorario);

    if (dataIso(entrada.dataReferencia) !== dataIso(saida.dataReferencia)) {
      continue;
    }

    if (minutosEntre(inicio, fim) <= 0) {
      continue;
    }

    intervalos.push({
      id: `${entrada.id}:${saida.id}`,
      data: dataIso(entrada.dataReferencia),
      inicio,
      fim,
    });
  }

  return {
    intervalos,
    marcacaoIncompleta: marcacoesOrdenadas.length % 2 !== 0,
  };
}

function limitesPorTipoDia(valor: unknown) {
  if (!valor || typeof valor !== "object") {
    return undefined;
  }

  return valor as AutorizacaoHoraExtraClassificacao["limitesPorTipoDia"];
}

export async function processarExecucaoAutorizacaoHorasExtras(params: {
  autorizacaoId: string;
  usuarioId?: string | null;
  perfilAtivoCodigo?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const autorizacao = await tx.autorizacaoHoraExtraAdministrativa.findUnique({
      where: {
        id: params.autorizacaoId,
      },
      include: {
        servidores: {
          include: {
            regras: true,
          },
        },
      },
    });

    if (!autorizacao) {
      throw new Error("Autorizacao de horas extras nao localizada.");
    }

    if (autorizacao.status === "RASCUNHO") {
      throw new Error("Registre a autorizacao no SECP antes de processar.");
    }

    const classificacoesExistentes =
      await tx.horaExtraClassificacaoIntervalo.count({
        where: {
          servidorAutorizado: {
            autorizacaoId: autorizacao.id,
          },
        },
      });

    if (classificacoesExistentes > 0) {
      throw new Error(
        "A autorizacao ja possui classificacoes. Use o fluxo de recalculo controlado.",
      );
    }

    const totais = {
      servidores: autorizacao.servidores.length,
      intervalos: 0,
      reconhecida: 0,
      compensacaoDebito: 0,
      naoAutorizada: 0,
      foraFaixa: 0,
      excedente: 0,
      marcacoesIncompletas: 0,
    };

    for (const servidor of autorizacao.servidores) {
      const [marcacoes, saldoBancoHoras] = await Promise.all([
        tx.marcacao.findMany({
          where: {
            servidorId: servidor.servidorId,
            status: "VALIDA",
            dataReferencia: {
              gte: servidor.periodoInicio,
              lte: servidor.periodoFim,
            },
          },
          select: {
            id: true,
            dataHora: true,
            dataReferencia: true,
            fusoHorario: true,
          },
          orderBy: [{ dataReferencia: "asc" }, { dataHora: "asc" }],
        }),
        tx.bancoHorasSaldo.findUnique({
          where: {
            servidorId: servidor.servidorId,
          },
          select: {
            saldoMinutos: true,
          },
        }),
      ]);
      const { intervalos, marcacaoIncompleta } = construirIntervalos(marcacoes);
      const debitoInicialMinutos = Math.max(
        0,
        -(saldoBancoHoras?.saldoMinutos ?? 0),
      );
      const resultado = classificarExecucaoHorasExtras({
        autorizacao: {
          periodoInicio: dataIso(servidor.periodoInicio),
          periodoFim: dataIso(servidor.periodoFim),
          limiteGlobalMinutos: servidor.quantidadeMaximaMinutos,
          limitesPorTipoDia: limitesPorTipoDia(servidor.limitesPorTipoDia),
          regrasPorData: servidor.regras.map((regra) => ({
            data: regra.data ? dataIso(regra.data) : undefined,
            tipoDia: regra.tipoDia ?? undefined,
            limiteMinutos: regra.limiteMinutos ?? undefined,
            faixaInicio: regra.faixaInicio ?? undefined,
            faixaFim: regra.faixaFim ?? undefined,
          })),
        },
        intervalosTrabalhados: intervalos,
        debitoInicialMinutos,
      });

      const execucoesCriadas = new Map<string, string>();

      for (const intervalo of intervalos) {
        const execucao = await tx.horaExtraExecucaoIntervalo.create({
          data: {
            servidorAutorizadoId: servidor.id,
            data: dataUtc(intervalo.data),
            inicio: intervalo.inicio,
            fim: intervalo.fim,
            minutosTrabalhados: minutosEntre(intervalo.inicio, intervalo.fim),
            origem: {
              intervaloOrigemId: intervalo.id,
            },
          },
        });

        if (intervalo.id) {
          execucoesCriadas.set(intervalo.id, execucao.id);
        }
      }

      if (resultado.segmentos.length > 0) {
        await tx.horaExtraClassificacaoIntervalo.createMany({
          data: resultado.segmentos.map((segmento) => ({
            servidorAutorizadoId: servidor.id,
            execucaoIntervaloId: segmento.intervaloOrigemId
              ? execucoesCriadas.get(segmento.intervaloOrigemId)
              : undefined,
            data: dataUtc(segmento.data),
            inicio: segmento.inicio,
            fim: segmento.fim,
            minutos: segmento.minutos,
            categoria: converterCategoria(segmento.categoria),
            motivo: segmento.motivo,
            metadados: {
              tipoDia: segmento.tipoDia,
            },
          })),
        });
      }

      await tx.autorizacaoHoraExtraServidor.update({
        where: {
          id: servidor.id,
        },
        data: {
          status:
            resultado.totais.NAO_AUTORIZADA > 0 ||
            resultado.totais.EXCEDENTE_A_AUTORIZACAO > 0 ||
            resultado.totais.FORA_FAIXA_PERMITIDA > 0 ||
            marcacaoIncompleta
              ? "PENDENTE_CONFERENCIA"
              : resultado.totais.HORA_EXTRA_RECONHECIDA > 0
                ? "REGULAR"
                : "SEM_EXECUCAO",
        },
      });

      if (marcacaoIncompleta) {
        await tx.horaExtraEvento.create({
          data: {
            autorizacaoId: autorizacao.id,
            servidorAutorizadoId: servidor.id,
            usuarioId: params.usuarioId ?? null,
            acao: "MARCACAO_INCOMPLETA_IDENTIFICADA",
            metadados: {
              perfilAtivo: params.perfilAtivoCodigo ?? null,
            },
          },
        });
      }

      totais.intervalos += intervalos.length;
      totais.reconhecida += resultado.totais.HORA_EXTRA_RECONHECIDA;
      totais.compensacaoDebito += resultado.totais.COMPENSACAO_DEBITO;
      totais.naoAutorizada += resultado.totais.NAO_AUTORIZADA;
      totais.foraFaixa += resultado.totais.FORA_FAIXA_PERMITIDA;
      totais.excedente += resultado.totais.EXCEDENTE_A_AUTORIZACAO;
      totais.marcacoesIncompletas += marcacaoIncompleta ? 1 : 0;
    }

    await tx.autorizacaoHoraExtraAdministrativa.update({
      where: {
        id: autorizacao.id,
      },
      data: {
        status:
          totais.intervalos > 0
            ? "AGUARDANDO_CONFERENCIA"
            : "VIGENTE",
      },
    });

    await tx.horaExtraEvento.create({
      data: {
        autorizacaoId: autorizacao.id,
        usuarioId: params.usuarioId ?? null,
        acao: "EXECUCAO_PROCESSADA",
        dadosDepois: totais,
        metadados: {
          perfilAtivo: params.perfilAtivoCodigo ?? null,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: params.usuarioId ?? null,
        entidade: "AutorizacaoHoraExtraAdministrativa",
        entidadeId: autorizacao.id,
        acao: "HORAS_EXTRAS_EXECUCAO_PROCESSADA",
        dadosDepois: totais,
        metadados: {
          perfilAtivo: params.perfilAtivoCodigo ?? null,
        },
      },
    });

    return totais;
  });
}
