import {
  aplicarLimiteCreditoMensal,
  calcularDataExpiracaoCompensacao,
} from "@/modules/banco-horas/application/services/aplicar-limites-banco-horas.service";
import { calcularSaldoBancoHoras } from "@/modules/banco-horas/application/services/calcular-banco-horas.service";
import { classificarHorasCreditoBancoHoras } from "@/modules/banco-horas/application/services/classificar-horas-banco-horas.service";
import { atualizarRastreamentoFifoBancoHorasTx } from "@/modules/banco-horas/application/services/rastrear-consumo-fifo-banco-horas.service";
import {
  carregarCalendarioInstitucionalPeriodo,
  classificarDiaInstitucional,
} from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import type { Prisma } from "@/generated/prisma/client";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";
import {
  bancoHorasAtivoNaCompetencia,
  buscarRegulamentacaoPontoServidor,
} from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type RegerarBancoHorasMesParams = {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  usuarioIdAuditoria?: string;
  origem?: string;
};

type AutorizacaoDisponivel = {
  id: string;
  tipo: "CREDITO" | "COMPENSACAO_CREDITO" | "COMPENSACAO_DEBITO";
  dataInicio: Date;
  dataFim: Date;
  minutosAutorizados: number;
  autorizadoPorUsuarioId: string;
  autorizadoEm: Date;
  movimentos: Array<{
    minutos: number;
  }>;
};

function autorizacaoAbrangeData(
  autorizacao: AutorizacaoDisponivel,
  dataReferencia: Date,
) {
  const inicioDia = new Date(dataReferencia);
  inicioDia.setUTCHours(0, 0, 0, 0);

  const fimDia = new Date(inicioDia);
  fimDia.setDate(fimDia.getDate() + 1);

  return autorizacao.dataInicio < fimDia && autorizacao.dataFim >= inicioDia;
}

function minutosDisponiveis(autorizacao: AutorizacaoDisponivel) {
  const utilizados = autorizacao.movimentos.reduce(
    (total, movimento) => total + movimento.minutos,
    0,
  );

  return Math.max(0, autorizacao.minutosAutorizados - utilizados);
}

function minutosCreditoRegulamentarBase(apuracao: {
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
}) {
  const excedenteReal = Math.max(
    0,
    apuracao.minutosTrabalhados - apuracao.cargaPrevistaMinutos,
  );

  return Math.min(Math.max(0, apuracao.minutosCredito), excedenteReal);
}

function hojeNoFuso(fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizarFusoHorario(fusoHorario),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const dia = Number(partes.find((parte) => parte.type === "day")?.value);

  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function dataLimiteMovimentos(params: {
  anoReferencia: number;
  mesReferencia: number;
  fusoHorario?: string | null;
}) {
  const inicio = new Date(
    Date.UTC(params.anoReferencia, params.mesReferencia - 1, 1),
  );
  const fim = new Date(Date.UTC(params.anoReferencia, params.mesReferencia, 1));
  const hoje = hojeNoFuso(params.fusoHorario);

  if (hoje < inicio) {
    return new Date(inicio.getTime() - 1);
  }

  if (hoje >= fim) {
    return new Date(fim.getTime() - 1);
  }

  return new Date(hoje.getTime() - 1);
}

function dataNormalizada(data: Date) {
  const normalizada = new Date(data);
  normalizada.setUTCHours(0, 0, 0, 0);
  return normalizada;
}

function afastamentoAbrangeData(
  afastamento: { dataInicio: Date; dataFim: Date | null },
  dataReferencia: Date,
) {
  const data = dataNormalizada(dataReferencia);
  const inicio = dataNormalizada(afastamento.dataInicio);
  const fim = afastamento.dataFim ? dataNormalizada(afastamento.dataFim) : null;

  return data >= inicio && (!fim || data <= fim);
}

function alocarAutorizacoes(params: {
  autorizacoes: AutorizacaoDisponivel[];
  tipos: AutorizacaoDisponivel["tipo"][];
  dataReferencia: Date;
  minutos: number;
}) {
  let restante = params.minutos;
  const alocacoes: Array<{
    autorizacao: AutorizacaoDisponivel;
    minutos: number;
  }> = [];

  for (const autorizacao of params.autorizacoes) {
    if (
      restante <= 0 ||
      !params.tipos.includes(autorizacao.tipo) ||
      !autorizacaoAbrangeData(autorizacao, params.dataReferencia)
    ) {
      continue;
    }

    const minutos = Math.min(restante, minutosDisponiveis(autorizacao));

    if (minutos > 0) {
      alocacoes.push({ autorizacao, minutos });
      autorizacao.movimentos.push({ minutos });
      restante -= minutos;
    }
  }

  return {
    alocacoes,
    minutosSemAutorizacao: restante,
  };
}

export async function regerarBancoHorasMesService({
  servidorId,
  anoReferencia,
  mesReferencia,
  usuarioIdAuditoria,
  origem = "REGERACAO_BANCO_HORAS_MES",
}: RegerarBancoHorasMesParams) {
  const inicio = new Date(Date.UTC(anoReferencia, mesReferencia - 1, 1));
  const fim = new Date(Date.UTC(anoReferencia, mesReferencia, 1));
  const saldoAtual = await prisma.bancoHorasSaldo.findUnique({
    where: {
      servidorId,
    },
    select: {
      competenciaInicioControle: true,
    },
  });

  if (
    saldoAtual?.competenciaInicioControle &&
    compararCompetencias(
      anoReferencia,
      mesReferencia,
      saldoAtual.competenciaInicioControle,
    ) < 0
  ) {
    return {
      apuracoesProcessadas: 0,
      autorizacoesConsideradas: 0,
      movimentosCriados: 0,
      saldo: await recalcularSaldoAtual(servidorId, saldoAtual.competenciaInicioControle),
    };
  }

  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId,
  });
  const regulamentacao = await buscarRegulamentacaoPontoServidor(servidorId);
  const competenciaAtual = `${anoReferencia}-${String(mesReferencia).padStart(2, "0")}`;
  const limiteMovimentos = dataLimiteMovimentos({
    anoReferencia,
    mesReferencia,
    fusoHorario,
  });

  if (!bancoHorasAtivoNaCompetencia(regulamentacao, competenciaAtual)) {
    return prisma.$transaction(async (tx) => {
      await tx.movimentoBancoHoras.deleteMany({
        where: {
          servidorId,
          anoReferencia,
          mesReferencia,
          origem: {
            in: ["APURACAO_DIARIA", "SOLICITACAO"],
          },
          status: {
            in: ["PENDENTE", "DESCONSIDERADO"],
          },
        },
      });

      const movimentos = await tx.movimentoBancoHoras.findMany({
        where: {
          servidorId,
        },
        orderBy: {
          dataReferencia: "asc",
        },
      });
      const saldo = calcularSaldoBancoHoras(movimentos, {
        competenciaInicioControle:
          regulamentacao.bancoHorasCompetenciaInicio ??
          saldoAtual?.competenciaInicioControle,
      });

      await tx.bancoHorasSaldo.upsert({
        where: {
          servidorId,
        },
        update: {
          ...saldo,
          competenciaInicioControle:
            regulamentacao.bancoHorasCompetenciaInicio ??
            saldoAtual?.competenciaInicioControle,
        },
        create: {
          servidorId,
          ...saldo,
          competenciaInicioControle:
            regulamentacao.bancoHorasCompetenciaInicio ??
            saldoAtual?.competenciaInicioControle,
        },
      });

      return {
        apuracoesProcessadas: 0,
        autorizacoesConsideradas: 0,
        movimentosCriados: 0,
        saldo,
      };
    });
  }

  const apuracoes = await prisma.apuracaoDiaria.findMany({
    where: {
      servidorId,
      dataReferencia: {
        gte: inicio,
        lt: fim,
        lte: limiteMovimentos,
      },
      status: {
        in: ["CALCULADA", "INCONSISTENTE"],
      },
      OR: [
        {
          minutosCredito: {
            gt: 0,
          },
        },
        {
          minutosDebito: {
            gt: 0,
          },
        },
      ],
    },
    orderBy: {
      dataReferencia: "asc",
    },
  });
  const calendario = await carregarCalendarioInstitucionalPeriodo({
    inicio,
    fimExclusivo: fim,
  });
  const afastamentosSarh = await prisma.afastamentoSarh.findMany({
    where: {
      servidorId,
      dataInicio: { lt: fim },
      OR: [{ dataFim: null }, { dataFim: { gte: inicio } }],
    },
    select: {
      dataInicio: true,
      dataFim: true,
    },
  });

  return prisma.$transaction(async (tx) => {
    await tx.movimentoBancoHoras.deleteMany({
      where: {
        servidorId,
        anoReferencia,
        mesReferencia,
        origem: {
          in: ["APURACAO_DIARIA", "SOLICITACAO"],
        },
        status: {
          in: ["PENDENTE", "DESCONSIDERADO"],
        },
      },
    });

    const autorizacoes = (await tx.autorizacaoBancoHoras.findMany({
      where: {
        servidorId,
        status: {
          in: ["AUTORIZADA", "UTILIZADA"],
        },
        dataInicio: {
          lt: fim,
        },
        dataFim: {
          gte: inicio,
        },
      },
      include: {
        movimentos: {
          where: {
            status: {
              in: ["PENDENTE", "VALIDADO"],
            },
          },
          select: {
            minutos: true,
          },
        },
      },
      orderBy: [
        {
          dataInicio: "asc",
        },
        {
          autorizadoEm: "asc",
        },
      ],
    })) as AutorizacaoDisponivel[];

    const movimentosValidados = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId,
        anoReferencia,
        mesReferencia,
        status: "VALIDADO",
        apuracaoDiariaId: {
          not: null,
        },
      },
      select: {
        apuracaoDiariaId: true,
        tipo: true,
        minutos: true,
      },
    });

    const creditosValidadosPorApuracao = new Map<string, number>();
    const debitosValidadosPorApuracao = new Map<string, number>();

    for (const movimento of movimentosValidados) {
      if (!movimento.apuracaoDiariaId) {
        continue;
      }

      if (["CREDITO", "COMPENSACAO_DEBITO"].includes(movimento.tipo)) {
        creditosValidadosPorApuracao.set(
          movimento.apuracaoDiariaId,
          (creditosValidadosPorApuracao.get(movimento.apuracaoDiariaId) ?? 0) +
            movimento.minutos,
        );
      }

      if (["DEBITO", "COMPENSACAO_CREDITO"].includes(movimento.tipo)) {
        debitosValidadosPorApuracao.set(
          movimento.apuracaoDiariaId,
          (debitosValidadosPorApuracao.get(movimento.apuracaoDiariaId) ?? 0) +
            movimento.minutos,
        );
      }
    }

    let creditoComputadoNoMes = movimentosValidados
      .filter((movimento) =>
        ["CREDITO", "COMPENSACAO_DEBITO"].includes(movimento.tipo),
      )
      .reduce((total, movimento) => total + movimento.minutos, 0);
    let movimentosCriados = 0;

    const expiraEm = calcularDataExpiracaoCompensacao({
      anoReferencia,
      mesReferencia,
      mesesExpiracaoCompensacao: regulamentacao.mesesExpiracaoCompensacao,
    });

    for (const apuracao of apuracoes) {
      if (
        afastamentosSarh.some((afastamento) =>
          afastamentoAbrangeData(afastamento, apuracao.dataReferencia),
        )
      ) {
        continue;
      }

      const minutosCreditoPendentes = Math.max(
        0,
        minutosCreditoRegulamentarBase(apuracao) -
          (creditosValidadosPorApuracao.get(apuracao.id) ?? 0),
      );
      const minutosDebitoPendentes = Math.max(
        0,
        apuracao.minutosDebito -
          (debitosValidadosPorApuracao.get(apuracao.id) ?? 0),
      );
      const classificacaoDia = await classificarDiaInstitucional(
        apuracao.dataReferencia,
        calendario,
        servidorId,
      );

      if (minutosCreditoPendentes > 0) {
        if (!regulamentacao.exigeAutorizacaoPreviaCredito) {
          const classificacaoBancoHoras = classificarHorasCreditoBancoHoras({
            apuracao: {
              ...apuracao,
              minutosCredito: minutosCreditoPendentes,
            },
            classificacaoDia,
            regulamentacao,
            temAutorizacaoPrevia: true,
            permiteConversaoEspecial: false,
          });

          if (classificacaoBancoHoras.minutosComputaveis <= 0) {
            if (classificacaoBancoHoras.minutosNaoComputaveis <= 0) {
              continue;
            }

            await tx.movimentoBancoHoras.create({
              data: {
                servidorId,
                apuracaoDiariaId: apuracao.id,
                tipo: "HORAS_NAO_AUTORIZADAS",
                origem: "APURACAO_DIARIA",
                status: "DESCONSIDERADO",
                dataReferencia: apuracao.dataReferencia,
                mesReferencia,
                anoReferencia,
                minutos: classificacaoBancoHoras.minutosNaoComputaveis,
                descricao: classificacaoBancoHoras.fundamento,
                metadados: metadadosClassificacaoBancoHoras({
                  origem,
                  apuracao,
                  classificacaoDia,
                  classificacaoBancoHoras,
                  regulamentacao,
                }),
              },
            });

            movimentosCriados++;
            continue;
          }

          const limite =
            classificacaoDia.tipo === "RECESSO_FORENSE" &&
            regulamentacao.recessoIgnoraLimiteMensal
              ? {
                  minutosComputaveis:
                    classificacaoBancoHoras.minutosComputaveis,
                  minutosAcimaLimite: 0,
                }
              : aplicarLimiteCreditoMensal({
                  creditoDoDiaMinutos:
                    classificacaoBancoHoras.minutosComputaveis,
                  creditoJaComputadoNoMesMinutos: creditoComputadoNoMes,
                  limiteCreditoMensalMinutos:
                    regulamentacao.limiteCreditoMensalMinutos,
                });

          if (limite.minutosComputaveis > 0) {
            await tx.movimentoBancoHoras.create({
              data: {
                servidorId,
                apuracaoDiariaId: apuracao.id,
                tipo: "CREDITO",
                origem: "APURACAO_DIARIA",
                status: "PENDENTE",
                dataReferencia: apuracao.dataReferencia,
                mesReferencia,
                anoReferencia,
                minutos: limite.minutosComputaveis,
                expiraEm,
                descricao:
                  "Crédito gerado pela apuração diária. Pendente de homologação mensal.",
                metadados: metadadosClassificacaoBancoHoras({
                  origem,
                  apuracao,
                  classificacaoDia,
                  classificacaoBancoHoras,
                  regulamentacao,
                }),
              },
            });

            movimentosCriados++;
            if (
              !(
                classificacaoDia.tipo === "RECESSO_FORENSE" &&
                regulamentacao.recessoIgnoraLimiteMensal
              )
            ) {
              creditoComputadoNoMes += limite.minutosComputaveis;
            }
          }

          if (limite.minutosAcimaLimite > 0) {
            await tx.movimentoBancoHoras.create({
              data: {
                servidorId,
                apuracaoDiariaId: apuracao.id,
                tipo: "HORAS_ACIMA_LIMITE",
                origem: "APURACAO_DIARIA",
                status: "DESCONSIDERADO",
                dataReferencia: apuracao.dataReferencia,
                mesReferencia,
                anoReferencia,
                minutos: limite.minutosAcimaLimite,
                descricao:
                  "Horas acima do limite ordinário mensal. Não computadas no saldo.",
                metadados: {
                  ...metadadosClassificacaoBancoHoras({
                    origem,
                    apuracao,
                    classificacaoDia,
                    classificacaoBancoHoras,
                    regulamentacao,
                  }),
                  limiteMensalMinutos:
                    regulamentacao.limiteCreditoMensalMinutos,
                  referendoDiref: {
                    status: "PENDENTE_SE_APLICAVEL",
                    descricao:
                      "Pode ser excepcionalmente referendado pela Direção do Foro mediante justificativa e processo SEI.",
                  },
                },
              },
            });

            movimentosCriados++;
          }

          continue;
        }

        const credito = alocarAutorizacoes({
          autorizacoes,
          tipos: ["COMPENSACAO_DEBITO", "CREDITO"],
          dataReferencia: apuracao.dataReferencia,
          minutos: minutosCreditoPendentes,
        });

        for (const alocacao of credito.alocacoes) {
          const classificacaoBancoHoras = classificarHorasCreditoBancoHoras({
            apuracao: {
              ...apuracao,
              minutosCredito: alocacao.minutos,
            },
            classificacaoDia,
            regulamentacao,
            temAutorizacaoPrevia: true,
            permiteConversaoEspecial: true,
          });

          if (classificacaoBancoHoras.minutosComputaveis <= 0) {
            if (classificacaoBancoHoras.minutosNaoComputaveis <= 0) {
              continue;
            }

            await tx.movimentoBancoHoras.create({
              data: {
                servidorId,
                apuracaoDiariaId: apuracao.id,
                autorizacaoBancoHorasId: alocacao.autorizacao.id,
                tipo: "HORAS_NAO_AUTORIZADAS",
                origem: "APURACAO_DIARIA",
                status: "DESCONSIDERADO",
                dataReferencia: apuracao.dataReferencia,
                mesReferencia,
                anoReferencia,
                minutos: classificacaoBancoHoras.minutosNaoComputaveis,
                autorizadoPorUsuarioId:
                  alocacao.autorizacao.autorizadoPorUsuarioId,
                autorizadoEm: alocacao.autorizacao.autorizadoEm,
                descricao: classificacaoBancoHoras.fundamento,
                metadados: metadadosClassificacaoBancoHoras({
                  origem,
                  apuracao,
                  classificacaoDia,
                  classificacaoBancoHoras,
                  regulamentacao,
                  autorizacaoBancoHorasId: alocacao.autorizacao.id,
                }),
              },
            });

            movimentosCriados++;
            continue;
          }

          const limite =
            classificacaoDia.tipo === "RECESSO_FORENSE" &&
            regulamentacao.recessoIgnoraLimiteMensal
              ? {
                  minutosComputaveis:
                    classificacaoBancoHoras.minutosComputaveis,
                  minutosAcimaLimite: 0,
                }
              : aplicarLimiteCreditoMensal({
                  creditoDoDiaMinutos:
                    classificacaoBancoHoras.minutosComputaveis,
                  creditoJaComputadoNoMesMinutos: creditoComputadoNoMes,
                  limiteCreditoMensalMinutos:
                    regulamentacao.limiteCreditoMensalMinutos,
                });

          if (limite.minutosComputaveis > 0) {
            await tx.movimentoBancoHoras.create({
              data: {
                servidorId,
                apuracaoDiariaId: apuracao.id,
                autorizacaoBancoHorasId: alocacao.autorizacao.id,
                tipo:
                  alocacao.autorizacao.tipo === "COMPENSACAO_DEBITO"
                    ? "COMPENSACAO_DEBITO"
                    : "CREDITO",
                origem: "APURACAO_DIARIA",
                status: "PENDENTE",
                dataReferencia: apuracao.dataReferencia,
                mesReferencia,
                anoReferencia,
                minutos: limite.minutosComputaveis,
                expiraEm,
                autorizadoPorUsuarioId:
                  alocacao.autorizacao.autorizadoPorUsuarioId,
                autorizadoEm: alocacao.autorizacao.autorizadoEm,
                descricao:
                  alocacao.autorizacao.tipo === "COMPENSACAO_DEBITO"
                    ? "Horas trabalhadas para compensação de débito, com autorização prévia da chefia."
                    : "Crédito gerado com autorização prévia da chefia. Pendente de homologação mensal.",
                metadados: metadadosClassificacaoBancoHoras({
                  origem,
                  apuracao,
                  classificacaoDia,
                  classificacaoBancoHoras,
                  regulamentacao,
                  autorizacaoBancoHorasId: alocacao.autorizacao.id,
                }),
              },
            });

            movimentosCriados++;
            if (
              !(
                classificacaoDia.tipo === "RECESSO_FORENSE" &&
                regulamentacao.recessoIgnoraLimiteMensal
              )
            ) {
              creditoComputadoNoMes += limite.minutosComputaveis;
            }
          }

          if (limite.minutosAcimaLimite > 0) {
            await tx.movimentoBancoHoras.create({
              data: {
                servidorId,
                apuracaoDiariaId: apuracao.id,
                autorizacaoBancoHorasId: alocacao.autorizacao.id,
                tipo: "HORAS_ACIMA_LIMITE",
                origem: "APURACAO_DIARIA",
                status: "DESCONSIDERADO",
                dataReferencia: apuracao.dataReferencia,
                mesReferencia,
                anoReferencia,
                minutos: limite.minutosAcimaLimite,
                autorizadoPorUsuarioId:
                  alocacao.autorizacao.autorizadoPorUsuarioId,
                autorizadoEm: alocacao.autorizacao.autorizadoEm,
                descricao:
                  "Horas autorizadas acima do limite ordinário mensal de 16h. Não computadas no saldo.",
                metadados: {
                  ...metadadosClassificacaoBancoHoras({
                    origem,
                    apuracao,
                    classificacaoDia,
                    classificacaoBancoHoras,
                    regulamentacao,
                    autorizacaoBancoHorasId: alocacao.autorizacao.id,
                  }),
                  limiteMensalMinutos:
                    regulamentacao.limiteCreditoMensalMinutos,
                  referendoDiref: {
                    status: "PENDENTE_SE_APLICAVEL",
                    descricao:
                      "Pode ser excepcionalmente referendado pela Direção do Foro mediante justificativa e processo SEI.",
                  },
                },
              },
            });

            movimentosCriados++;
          }
        }

        if (credito.minutosSemAutorizacao > 0) {
          const classificacaoBancoHoras = classificarHorasCreditoBancoHoras({
            apuracao: {
              ...apuracao,
              minutosCredito: credito.minutosSemAutorizacao,
            },
            classificacaoDia,
            regulamentacao,
            temAutorizacaoPrevia: false,
          });

          if (classificacaoBancoHoras.minutosNaoComputaveis > 0) {

          await tx.movimentoBancoHoras.create({
            data: {
              servidorId,
              apuracaoDiariaId: apuracao.id,
              tipo: "HORAS_NAO_AUTORIZADAS",
              origem: "APURACAO_DIARIA",
              status: "DESCONSIDERADO",
              dataReferencia: apuracao.dataReferencia,
              mesReferencia,
              anoReferencia,
              minutos: classificacaoBancoHoras.minutosNaoComputaveis,
              descricao:
                "Horas excedentes sem autorização prévia da chefia. Não computadas no saldo do banco de horas.",
              metadados: metadadosClassificacaoBancoHoras({
                origem,
                apuracao,
                classificacaoDia,
                classificacaoBancoHoras,
                regulamentacao,
              }),
            },
          });

          movimentosCriados++;
          }
        }
      }

      if (minutosDebitoPendentes > 0) {
        const compensacao = alocarAutorizacoes({
          autorizacoes,
          tipos: ["COMPENSACAO_CREDITO"],
          dataReferencia: apuracao.dataReferencia,
          minutos: minutosDebitoPendentes,
        });

        for (const alocacao of compensacao.alocacoes) {
          await tx.movimentoBancoHoras.create({
            data: {
              servidorId,
              apuracaoDiariaId: apuracao.id,
              autorizacaoBancoHorasId: alocacao.autorizacao.id,
              tipo: "COMPENSACAO_CREDITO",
              origem: "SOLICITACAO",
              status: "PENDENTE",
              dataReferencia: apuracao.dataReferencia,
              mesReferencia,
              anoReferencia,
              minutos: alocacao.minutos,
              expiraEm,
              autorizadoPorUsuarioId:
                alocacao.autorizacao.autorizadoPorUsuarioId,
              autorizadoEm: alocacao.autorizacao.autorizadoEm,
              descricao:
                "Débito compensado com crédito disponível, mediante autorização prévia da chefia.",
              metadados: {
                origem,
                autorizacaoBancoHorasId: alocacao.autorizacao.id,
                resultadoApuracao: apuracao.resultado,
                classificacaoDia: {
                  tipo: classificacaoDia.tipo,
                  descricao: classificacaoDia.descricao,
                  fonte: classificacaoDia.fonte,
                  abrangencia: classificacaoDia.abrangencia ?? null,
                },
                regulamentacaoPonto: regulamentacao,
              },
            },
          });

          movimentosCriados++;
        }

        if (compensacao.minutosSemAutorizacao > 0) {
          await tx.movimentoBancoHoras.create({
            data: {
              servidorId,
              apuracaoDiariaId: apuracao.id,
              tipo: "DEBITO",
              origem: "APURACAO_DIARIA",
              status: "PENDENTE",
              dataReferencia: apuracao.dataReferencia,
              mesReferencia,
              anoReferencia,
              minutos: compensacao.minutosSemAutorizacao,
              expiraEm,
              descricao:
                "Débito gerado pela apuração diária. Pendente de validação ou compensação autorizada.",
              metadados: {
                origem,
                resultadoApuracao: apuracao.resultado,
                statusApuracao: apuracao.status,
                classificacaoDia: {
                  tipo: classificacaoDia.tipo,
                  descricao: classificacaoDia.descricao,
                  fonte: classificacaoDia.fonte,
                  abrangencia: classificacaoDia.abrangencia ?? null,
                },
                regulamentacaoPonto: regulamentacao,
              },
            },
          });

          movimentosCriados++;
        }
      }
    }

    for (const autorizacao of autorizacoes) {
      const utilizados = autorizacao.movimentos.reduce(
        (total, movimento) => total + movimento.minutos,
        0,
      );

      await tx.autorizacaoBancoHoras.update({
        where: {
          id: autorizacao.id,
        },
        data: {
          status:
            utilizados >= autorizacao.minutosAutorizados
              ? "UTILIZADA"
              : "AUTORIZADA",
        },
      });
    }

    await atualizarRastreamentoFifoBancoHorasTx({
      tx,
      servidorId,
    });

    const movimentos = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId,
      },
      orderBy: {
        dataReferencia: "asc",
      },
    });

    const saldo = calcularSaldoBancoHoras(movimentos, {
      competenciaInicioControle: saldoAtual?.competenciaInicioControle,
    });

    await tx.bancoHorasSaldo.upsert({
      where: {
        servidorId,
      },
      update: saldo,
      create: {
        servidorId,
        ...saldo,
      },
    });

    if (usuarioIdAuditoria) {
      await tx.auditoriaEvento.create({
        data: {
          usuarioId: usuarioIdAuditoria,
          entidade: "BancoHoras",
          entidadeId: servidorId,
          acao: "BANCO_HORAS_MES_REGERADO",
          dadosDepois: {
            servidorId,
            anoReferencia,
            mesReferencia,
            apuracoesProcessadas: apuracoes.length,
            autorizacoesConsideradas: autorizacoes.length,
            movimentosCriados,
            saldo,
            origem,
            regulamentacaoPonto: regulamentacao,
          },
        },
      });
    }

    return {
      apuracoesProcessadas: apuracoes.length,
      autorizacoesConsideradas: autorizacoes.length,
      movimentosCriados,
      saldo,
    };
  });
}

function metadadosClassificacaoBancoHoras(params: {
  origem: string;
  apuracao: { resultado: string; status: string };
  classificacaoDia: Awaited<ReturnType<typeof classificarDiaInstitucional>>;
  classificacaoBancoHoras: ReturnType<typeof classificarHorasCreditoBancoHoras>;
  regulamentacao: unknown;
  autorizacaoBancoHorasId?: string;
}): Prisma.InputJsonObject {
  return {
    origem: params.origem,
    autorizacaoBancoHorasId: params.autorizacaoBancoHorasId ?? null,
    resultadoApuracao: params.apuracao.resultado,
    statusApuracao: params.apuracao.status,
    classificacaoDia: {
      tipo: params.classificacaoDia.tipo,
      descricao: params.classificacaoDia.descricao,
      fonte: params.classificacaoDia.fonte,
      abrangencia: params.classificacaoDia.abrangencia ?? null,
      eventoCalendarioId: params.classificacaoDia.eventoCalendarioId ?? null,
      recessoForenseId: params.classificacaoDia.recessoForenseId ?? null,
    },
    regraBancoHoras: params.classificacaoBancoHoras,
    regulamentacaoPonto: JSON.parse(
      JSON.stringify(params.regulamentacao),
    ) as Prisma.InputJsonValue,
  };
}

function compararCompetencias(
  anoReferencia: number,
  mesReferencia: number,
  competenciaInicioControle: string,
) {
  const [anoInicio, mesInicio] = competenciaInicioControle.split("-").map(Number);
  return anoReferencia === anoInicio
    ? mesReferencia - mesInicio
    : anoReferencia - anoInicio;
}

async function recalcularSaldoAtual(
  servidorId: string,
  competenciaInicioControle: string,
) {
  const movimentos = await prisma.movimentoBancoHoras.findMany({
    where: {
      servidorId,
    },
    orderBy: {
      dataReferencia: "asc",
    },
  });

  const saldo = calcularSaldoBancoHoras(movimentos, {
    competenciaInicioControle,
  });

  await prisma.bancoHorasSaldo.upsert({
    where: {
      servidorId,
    },
    update: saldo,
    create: {
      servidorId,
      ...saldo,
      competenciaInicioControle,
    },
  });

  return saldo;
}
