import { prisma } from "@/shared/infrastructure/database/prisma";
import { resolverChefiaResponsavelDaUnidade } from "@/modules/chefias/application/services/resolver-chefia.service";
import { recalcularMesServidorService } from "@/modules/recalculo/application/services/recalcular-mes-servidor.service";
import { listarServidoresDaUnidadeNoMes } from "../../infrastructure/repositories/homologacao.repository";
import { validarPendenciasHomologacaoServidor } from "./validar-pendencias-homologacao.service";

export async function prepararFechamentoUnidadeService(params: {
  unidadeId: string;
  anoReferencia: number;
  mesReferencia: number;
  usuarioId: string;
  recalcularAntes?: boolean;
}) {
  const chefia = await resolverChefiaResponsavelDaUnidade(params.unidadeId);

  const servidores = await listarServidoresDaUnidadeNoMes({
    unidadeId: params.unidadeId,
    anoReferencia: params.anoReferencia,
    mesReferencia: params.mesReferencia,
  });

  if (params.recalcularAntes) {
    for (const servidor of servidores) {
      await recalcularMesServidorService({
        servidorId: servidor.id,
        anoReferencia: params.anoReferencia,
        mesReferencia: params.mesReferencia,
        usuarioIdAuditoria: params.usuarioId,
        origem: "PREPARACAO_FECHAMENTO_MENSAL",
      });
    }
  }

  const fechamento = await prisma.$transaction(async (tx) => {
    const fechamentoAtual = await tx.fechamentoMensalUnidade.upsert({
      where: {
        unidadeId_anoReferencia_mesReferencia: {
          unidadeId: params.unidadeId,
          anoReferencia: params.anoReferencia,
          mesReferencia: params.mesReferencia,
        },
      },
      update: {
        status: "EM_HOMOLOGACAO",
        gestorResponsavelId: chefia?.gestorUnidadeId ?? null,
        metadados: {
          quantidadeServidores: servidores.length,
          preparadoEm: new Date(),
        },
      },
      create: {
        unidadeId: params.unidadeId,
        gestorResponsavelId: chefia?.gestorUnidadeId ?? null,
        anoReferencia: params.anoReferencia,
        mesReferencia: params.mesReferencia,
        status: "EM_HOMOLOGACAO",
        abertoPorUsuarioId: params.usuarioId,
        metadados: {
          quantidadeServidores: servidores.length,
          preparadoEm: new Date(),
        },
      },
    });

    return fechamentoAtual;
  });

  for (const servidor of servidores) {
    const validacao = await validarPendenciasHomologacaoServidor({
      servidorId: servidor.id,
      anoReferencia: params.anoReferencia,
      mesReferencia: params.mesReferencia,
    });

    await prisma.homologacaoServidorMes.upsert({
      where: {
        fechamentoId_servidorId: {
          fechamentoId: fechamento.id,
          servidorId: servidor.id,
        },
      },
      update: {
        status: validacao.pendencias.length > 0 ? "COM_PENDENCIAS" : "PENDENTE",
        cargaPrevistaMinutos: validacao.totais.cargaPrevistaMinutos,
        minutosTrabalhados: validacao.totais.minutosTrabalhados,
        minutosCredito: validacao.totais.minutosCredito,
        minutosDebito: validacao.totais.minutosDebito,
        faltas: validacao.totais.faltas,
        saldoBancoAntesMinutos: servidor.bancoHorasSaldo?.saldoMinutos ?? 0,
        pendencias: validacao.pendencias,
      },
      create: {
        fechamentoId: fechamento.id,
        servidorId: servidor.id,
        status: validacao.pendencias.length > 0 ? "COM_PENDENCIAS" : "PENDENTE",
        cargaPrevistaMinutos: validacao.totais.cargaPrevistaMinutos,
        minutosTrabalhados: validacao.totais.minutosTrabalhados,
        minutosCredito: validacao.totais.minutosCredito,
        minutosDebito: validacao.totais.minutosDebito,
        faltas: validacao.totais.faltas,
        saldoBancoAntesMinutos: servidor.bancoHorasSaldo?.saldoMinutos ?? 0,
        pendencias: validacao.pendencias,
      },
    });
  }

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: params.usuarioId,
      entidade: "FechamentoMensalUnidade",
      entidadeId: fechamento.id,
      acao: "FECHAMENTO_MENSAL_PREPARADO",
      dadosDepois: {
        unidadeId: params.unidadeId,
        anoReferencia: params.anoReferencia,
        mesReferencia: params.mesReferencia,
        quantidadeServidores: servidores.length,
        recalcularAntes: Boolean(params.recalcularAntes),
      },
    },
  });

  return fechamento;
}
