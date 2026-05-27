"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  aplicarLimiteCreditoMensal,
  calcularDataExpiracaoCompensacao,
} from "../services/aplicar-limites-banco-horas.service";
import { calcularSaldoBancoHoras } from "../services/calcular-banco-horas.service";
import {
  listarApuracoesCalculadasSemMovimento,
  somarCreditoValidadoNoMes,
} from "../../infrastructure/repositories/banco-horas.repository";

export async function gerarMovimentosBancoHorasAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("banco-horas:gerenciar:global")) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const anoReferencia = Number(formData.get("anoReferencia") ?? 0);
  const mesReferencia = Number(formData.get("mesReferencia") ?? 0);

  if (!servidorId || !anoReferencia || !mesReferencia) {
    return;
  }

  const apuracoes = await listarApuracoesCalculadasSemMovimento({
    servidorId,
    anoReferencia,
    mesReferencia,
  });

  let creditoJaComputadoNoMes = await somarCreditoValidadoNoMes({
    servidorId,
    anoReferencia,
    mesReferencia,
  });

  await prisma.$transaction(async (tx) => {
    for (const apuracao of apuracoes) {
      const dataReferencia = apuracao.dataReferencia;
      const expiraEm = calcularDataExpiracaoCompensacao({
        anoReferencia,
        mesReferencia,
      });

      if (apuracao.minutosCredito > 0) {
        const limite = aplicarLimiteCreditoMensal({
          creditoDoDiaMinutos: apuracao.minutosCredito,
          creditoJaComputadoNoMesMinutos: creditoJaComputadoNoMes,
        });

        if (limite.minutosComputaveis > 0) {
          await tx.movimentoBancoHoras.create({
            data: {
              servidorId,
              apuracaoDiariaId: apuracao.id,
              tipo: "CREDITO",
              origem: "APURACAO_DIARIA",
              status: "PENDENTE",
              dataReferencia,
              mesReferencia,
              anoReferencia,
              minutos: limite.minutosComputaveis,
              expiraEm,
              descricao:
                "Crédito gerado automaticamente a partir da apuração diária. Pendente de validação/autorização da chefia.",
              metadados: {
                resultadoApuracao: apuracao.resultado,
                statusApuracao: apuracao.status,
              },
            },
          });

          creditoJaComputadoNoMes += limite.minutosComputaveis;
        }

        if (limite.minutosAcimaLimite > 0) {
          await tx.movimentoBancoHoras.create({
            data: {
              servidorId,
              apuracaoDiariaId: apuracao.id,
              tipo: "HORAS_ACIMA_LIMITE",
              origem: "APURACAO_DIARIA",
              status: "DESCONSIDERADO",
              dataReferencia,
              mesReferencia,
              anoReferencia,
              minutos: limite.minutosAcimaLimite,
              descricao:
                "Horas acima do limite ordinário mensal. Não computadas no saldo do banco de horas.",
              metadados: {
                limiteMensalMinutos: 16 * 60,
              },
            },
          });
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
            dataReferencia,
            mesReferencia,
            anoReferencia,
            minutos: apuracao.minutosDebito,
            expiraEm,
            descricao:
              "Débito gerado automaticamente a partir da apuração diária. Pendente de validação/homologação.",
            metadados: {
              resultadoApuracao: apuracao.resultado,
              statusApuracao: apuracao.status,
            },
          },
        });
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

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "BancoHoras",
        entidadeId: servidorId,
        acao: "BANCO_HORAS_MOVIMENTOS_GERADOS",
        dadosDepois: {
          servidorId,
          anoReferencia,
          mesReferencia,
          quantidadeApuracoesProcessadas: apuracoes.length,
          saldo,
        },
      },
    });
  });

  revalidatePath("/banco-horas");
}