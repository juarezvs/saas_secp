"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { buscarServidorSolicitantePorUsuarioId } from "@/modules/solicitacoes/infrastructure/repositories/solicitacao.repository";
import { resolverChefiaResponsavelDaUnidade } from "@/modules/chefias/application/services/resolver-chefia.service";
import { validarPendenciasHomologacaoServidor } from "../services/validar-pendencias-homologacao.service";
import { atualizarStatusFechamentoService } from "../services/atualizar-status-fechamento.service";

export async function enviarEspelhoHomologacaoAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("espelho-ponto:visualizar:proprio")) {
    return;
  }

  const anoReferencia = Number(formData.get("anoReferencia") ?? 0);
  const mesReferencia = Number(formData.get("mesReferencia") ?? 0);

  if (
    !Number.isInteger(anoReferencia) ||
    !Number.isInteger(mesReferencia) ||
    mesReferencia < 1 ||
    mesReferencia > 12
  ) {
    return;
  }

  const servidor = await buscarServidorSolicitantePorUsuarioId(session.user.id);
  const lotacaoAtual = servidor?.lotacoes[0];

  if (!servidor || !lotacaoAtual) {
    return;
  }

  const chefia = await resolverChefiaResponsavelDaUnidade(lotacaoAtual.unidadeId);
  const validacao = await validarPendenciasHomologacaoServidor({
    servidorId: servidor.id,
    anoReferencia,
    mesReferencia,
  });

  const homologacao = await prisma.$transaction(async (tx) => {
    const fechamento = await tx.fechamentoMensalUnidade.upsert({
      where: {
        unidadeId_anoReferencia_mesReferencia: {
          unidadeId: lotacaoAtual.unidadeId,
          anoReferencia,
          mesReferencia,
        },
      },
      update: {
        status: "EM_HOMOLOGACAO",
        gestorResponsavelId: chefia?.gestorUnidadeId ?? null,
      },
      create: {
        unidadeId: lotacaoAtual.unidadeId,
        gestorResponsavelId: chefia?.gestorUnidadeId ?? null,
        anoReferencia,
        mesReferencia,
        status: "EM_HOMOLOGACAO",
        abertoPorUsuarioId: session.user.id,
        metadados: {
          origem: "ENVIO_ESPELHO_SERVIDOR",
        },
      },
    });
    const existente = await tx.homologacaoServidorMes.findUnique({
      where: {
        fechamentoId_servidorId: {
          fechamentoId: fechamento.id,
          servidorId: servidor.id,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (
      existente &&
      ["PENDENTE", "COM_PENDENCIAS", "HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(
        existente.status,
      )
    ) {
      const envioAnterior = await tx.auditoriaEvento.findFirst({
        where: {
          entidade: "HomologacaoServidorMes",
          entidadeId: existente.id,
          acao: "ESPELHO_PONTO_ENVIADO_CHEFIA",
        },
        select: {
          id: true,
        },
      });

      if (!envioAnterior && !String(existente.status).startsWith("HOMOLOGADO")) {
        await tx.auditoriaEvento.create({
          data: {
            usuarioId: session.user.id,
            entidade: "HomologacaoServidorMes",
            entidadeId: existente.id,
            acao: "ESPELHO_PONTO_ENVIADO_CHEFIA",
            dadosDepois: {
              servidorId: servidor.id,
              fechamentoId: fechamento.id,
              anoReferencia,
              mesReferencia,
              status: existente.status,
              origem: "REGISTRO_EXISTENTE",
            },
          },
        });
      }

      return { id: existente.id, fechamentoId: fechamento.id };
    }

    const saldoBanco = await tx.bancoHorasSaldo.findUnique({
      where: {
        servidorId: servidor.id,
      },
      select: {
        saldoMinutos: true,
      },
    });
    const salvo = await tx.homologacaoServidorMes.upsert({
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
        saldoBancoAntesMinutos: saldoBanco?.saldoMinutos ?? 0,
        pendencias: validacao.pendencias,
        observacaoChefia: null,
        homologadoPorUsuarioId: null,
        homologadoEm: null,
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
        saldoBancoAntesMinutos: saldoBanco?.saldoMinutos ?? 0,
        pendencias: validacao.pendencias,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "HomologacaoServidorMes",
        entidadeId: salvo.id,
        acao: "ESPELHO_PONTO_ENVIADO_CHEFIA",
        dadosDepois: {
          servidorId: servidor.id,
          fechamentoId: fechamento.id,
          anoReferencia,
          mesReferencia,
          status: salvo.status,
          totalPendencias: validacao.pendencias.length,
        },
      },
    });

    return { id: salvo.id, fechamentoId: fechamento.id };
  });

  await atualizarStatusFechamentoService(homologacao.fechamentoId);

  revalidatePath("/espelho-ponto");
  revalidatePath("/homologacao");
  revalidatePath(`/homologacao/${homologacao.fechamentoId}`);
}
