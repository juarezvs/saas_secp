import {
  aplicarLimiteCreditoMensal,
  calcularDataExpiracaoCompensacao,
} from "@/modules/banco-horas/application/services/aplicar-limites-banco-horas.service";
import { calcularSaldoBancoHoras } from "@/modules/banco-horas/application/services/calcular-banco-horas.service";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { buscarRegulamentacaoPontoServidor } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";
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

function dataLimiteMovimentos(params: {
  anoReferencia: number;
  mesReferencia: number;
  fusoHorario?: string | null;
}) {
  const inicio = new Date(Date.UTC(params.anoReferencia, params.mesReferencia - 1, 1));
  const fim = new Date(Date.UTC(params.anoReferencia, params.mesReferencia, 1));
  const hoje = hojeNoFuso(params.fusoHorario);

  if (hoje < inicio) {
    return new Date(inicio.getTime() - 1);
  }

  if (hoje >= fim) {
    return new Date(fim.getTime() - 1);
  }

  return hoje;
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
  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId,
  });
  const regulamentacao = await buscarRegulamentacaoPontoServidor(servidorId);
  const limiteMovimentos = dataLimiteMovimentos({
    anoReferencia,
    mesReferencia,
    fusoHorario,
  });

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
      mesesExpiracaoCompensacao:
        regulamentacao.mesesExpiracaoCompensacao,
    });

    for (const apuracao of apuracoes) {
      const minutosCreditoPendentes = Math.max(
        0,
        apuracao.minutosCredito -
          (creditosValidadosPorApuracao.get(apuracao.id) ?? 0),
      );
      const minutosDebitoPendentes = Math.max(
        0,
        apuracao.minutosDebito -
          (debitosValidadosPorApuracao.get(apuracao.id) ?? 0),
      );

      if (minutosCreditoPendentes > 0) {
        const credito = alocarAutorizacoes({
          autorizacoes,
          tipos: ["COMPENSACAO_DEBITO", "CREDITO"],
          dataReferencia: apuracao.dataReferencia,
          minutos: minutosCreditoPendentes,
        });

        for (const alocacao of credito.alocacoes) {
          const limite = aplicarLimiteCreditoMensal({
            creditoDoDiaMinutos: alocacao.minutos,
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
                metadados: {
                  origem,
                  autorizacaoBancoHorasId: alocacao.autorizacao.id,
                  resultadoApuracao: apuracao.resultado,
                  statusApuracao: apuracao.status,
                  regulamentacaoPonto: regulamentacao,
                },
              },
            });

            movimentosCriados++;
            creditoComputadoNoMes += limite.minutosComputaveis;
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
                  origem,
                  autorizacaoBancoHorasId: alocacao.autorizacao.id,
                  limiteMensalMinutos:
                    regulamentacao.limiteCreditoMensalMinutos,
                  regulamentacaoPonto: regulamentacao,
                },
              },
            });

            movimentosCriados++;
          }
        }

        if (credito.minutosSemAutorizacao > 0) {
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
              minutos: credito.minutosSemAutorizacao,
              descricao:
                "Horas excedentes sem autorização prévia da chefia. Não computadas no saldo do banco de horas.",
              metadados: {
                origem,
                motivo: "AUSENCIA_AUTORIZACAO_PREVIA",
                regulamentacaoPonto: regulamentacao,
              },
            },
          });

          movimentosCriados++;
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

    const movimentos = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId,
      },
      orderBy: {
        dataReferencia: "asc",
      },
    });

    const saldo = calcularSaldoBancoHoras(movimentos);

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
