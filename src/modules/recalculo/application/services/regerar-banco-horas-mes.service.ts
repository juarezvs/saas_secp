import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  aplicarLimiteCreditoMensal,
  calcularDataExpiracaoCompensacao,
} from "@/modules/banco-horas/application/services/aplicar-limites-banco-horas.service";
import { calcularSaldoBancoHoras } from "@/modules/banco-horas/application/services/calcular-banco-horas.service";

export type RegerarBancoHorasMesParams = {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  usuarioIdAuditoria?: string;
  origem?: string;
};

export async function regerarBancoHorasMesService({
  servidorId,
  anoReferencia,
  mesReferencia,
  usuarioIdAuditoria,
  origem = "REGERACAO_BANCO_HORAS_MES",
}: RegerarBancoHorasMesParams) {
  const inicio = new Date(anoReferencia, mesReferencia - 1, 1);
  const fim = new Date(anoReferencia, mesReferencia, 1);

  const apuracoes = await prisma.apuracaoDiaria.findMany({
    where: {
      servidorId,
      dataReferencia: {
        gte: inicio,
        lt: fim,
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

  const resultado = await prisma.$transaction(async (tx) => {
    /*
     * Regra de segurança:
     * - Remove apenas movimentos automáticos ainda não homologados/validados.
     * - Não remove VALIDADO, ESTORNADO, EXPIRADO ou movimentos manuais.
     */
    await tx.movimentoBancoHoras.deleteMany({
      where: {
        servidorId,
        anoReferencia,
        mesReferencia,
        origem: "APURACAO_DIARIA",
        status: {
          in: ["PENDENTE", "DESCONSIDERADO"],
        },
      },
    });

    let creditoComputadoNoMes = 0;
    let movimentosCriados = 0;

    const expiraEm = calcularDataExpiracaoCompensacao({
      anoReferencia,
      mesReferencia,
    });

    for (const apuracao of apuracoes) {
      if (apuracao.minutosCredito > 0) {
        const limite = aplicarLimiteCreditoMensal({
          creditoDoDiaMinutos: apuracao.minutosCredito,
          creditoJaComputadoNoMesMinutos: creditoComputadoNoMes,
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
                "Crédito gerado automaticamente após recálculo da apuração diária. Pendente de validação da chefia.",
              metadados: {
                origem,
                resultadoApuracao: apuracao.resultado,
                statusApuracao: apuracao.status,
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
              tipo: "HORAS_ACIMA_LIMITE",
              origem: "APURACAO_DIARIA",
              status: "DESCONSIDERADO",
              dataReferencia: apuracao.dataReferencia,
              mesReferencia,
              anoReferencia,
              minutos: limite.minutosAcimaLimite,
              descricao:
                "Horas acima do limite ordinário mensal de 16h. Não computadas no saldo do banco de horas.",
              metadados: {
                origem,
                limiteMensalMinutos: 16 * 60,
              },
            },
          });

          movimentosCriados++;
        }
      }

      if (apuracao.minutosDebito > 0) {
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
            minutos: apuracao.minutosDebito,
            expiraEm,
            descricao:
              "Débito gerado automaticamente após recálculo da apuração diária. Pendente de validação/homologação.",
            metadados: {
              origem,
              resultadoApuracao: apuracao.resultado,
              statusApuracao: apuracao.status,
            },
          },
        });

        movimentosCriados++;
      }
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
            movimentosCriados,
            saldo,
            origem,
          },
        },
      });
    }

    return {
      apuracoesProcessadas: apuracoes.length,
      movimentosCriados,
      saldo,
    };
  });

  return resultado;
}
