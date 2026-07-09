import { prisma } from "@/shared/infrastructure/database/prisma";
import { calcularSaldoBancoHoras } from "./calcular-banco-horas.service";

export type ExpirarDebitosVencidosParams = {
  servidorId: string;
  usuarioIdAuditoria: string;
  dataProcessamento?: Date;
};

function inicioDoDiaManaus(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);

  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const dia = Number(partes.find((parte) => parte.type === "day")?.value);

  return new Date(Date.UTC(ano, mes - 1, dia));
}

function metadadosComoObjeto(metadados: unknown) {
  if (!metadados || typeof metadados !== "object" || Array.isArray(metadados)) {
    return {};
  }

  return metadados as Record<string, unknown>;
}

export async function expirarDebitosVencidosService({
  servidorId,
  usuarioIdAuditoria,
  dataProcessamento,
}: ExpirarDebitosVencidosParams) {
  const hoje = inicioDoDiaManaus(dataProcessamento);

  return prisma.$transaction(async (tx) => {
    const debitosVencidos = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId,
        tipo: "DEBITO",
        status: "VALIDADO",
        expiraEm: {
          lt: hoje,
        },
      },
      select: {
        id: true,
        minutos: true,
        dataReferencia: true,
        expiraEm: true,
        metadados: true,
      },
      orderBy: {
        dataReferencia: "asc",
      },
    });

    for (const debito of debitosVencidos) {
      await tx.movimentoBancoHoras.update({
        where: {
          id: debito.id,
        },
        data: {
          status: "EXPIRADO",
          observacao:
            "Debito nao compensado no prazo regulamentar. Encaminhar providencia para desconto em folha.",
          metadados: {
            ...metadadosComoObjeto(debito.metadados),
            descontoFolha: {
              status: "PENDENTE_PROVIDENCIA",
              motivo: "DEBITO_NAO_COMPENSADO_NO_PRAZO",
              processadoEm: new Date().toISOString(),
              usuarioId: usuarioIdAuditoria,
              expiraEm: debito.expiraEm?.toISOString() ?? null,
            },
          },
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
    const saldoAtual = await tx.bancoHorasSaldo.findUnique({
      where: {
        servidorId,
      },
      select: {
        competenciaInicioControle: true,
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

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: usuarioIdAuditoria,
        entidade: "BancoHoras",
        entidadeId: servidorId,
        acao: "DEBITOS_VENCIDOS_EXPIRADOS_PARA_DESCONTO_FOLHA",
        dadosDepois: {
          servidorId,
          dataProcessamento: hoje,
          movimentosExpirados: debitosVencidos.map((debito) => ({
            id: debito.id,
            minutos: debito.minutos,
            dataReferencia: debito.dataReferencia,
            expiraEm: debito.expiraEm,
          })),
          totalMinutos: debitosVencidos.reduce(
            (total, debito) => total + debito.minutos,
            0,
          ),
          saldo,
        },
      },
    });

    return {
      quantidade: debitosVencidos.length,
      totalMinutos: debitosVencidos.reduce(
        (total, debito) => total + debito.minutos,
        0,
      ),
      saldo,
    };
  });
}
