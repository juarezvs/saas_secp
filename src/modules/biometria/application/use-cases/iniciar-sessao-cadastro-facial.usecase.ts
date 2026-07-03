import { prisma } from "@/shared/infrastructure/database/prisma";

import { REGRAS_ENROLLMENT_FACIAL } from "../../domain/biometria-facial.rules";
import type { SessaoEnrollmentFacialPublica } from "../../domain/biometria-facial.types";
import { buscarServidorBiometriaPorUsuarioId } from "../../infrastructure/repositories/biometria.repository";
import {
  criarNonceEnrollment,
  criarSequenciaDesafios,
  hashNonceEnrollment,
} from "../../infrastructure/services/challenge.service";
import { EnrollmentFacialError } from "./enrollment.error";

export async function iniciarSessaoCadastroFacial(params: {
  usuarioId: string;
  servidorId?: string;
  consentimento: boolean;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<SessaoEnrollmentFacialPublica> {
  if (!params.consentimento) {
    throw new EnrollmentFacialError(
      "CONSENT_REQUIRED",
      "Confirme que leu as informações sobre o uso da biometria facial.",
    );
  }

  const servidor = params.servidorId
    ? await prisma.servidor.findFirst({
        where: {
          id: params.servidorId,
          ativo: true,
        },
      })
    : await buscarServidorBiometriaPorUsuarioId(params.usuarioId);

  if (!servidor) {
    throw new EnrollmentFacialError(
      "SERVER_NOT_FOUND",
      "Nenhum servidor ativo foi localizado para o cadastro facial.",
      404,
    );
  }

  const quinzeMinutosAtras = new Date(Date.now() - 15 * 60 * 1000);
  const falhasRecentes = await prisma.sessaoCadastroFacial.findMany({
    where: {
      servidorId: servidor.id,
      status: "REPROVADA",
      criadoEm: {
        gte: quinzeMinutosAtras,
      },
    },
    orderBy: {
      atualizadoEm: "desc",
    },
    take: 10,
    select: {
      atualizadoEm: true,
    },
  });

  if (falhasRecentes.length >= 5) {
    throw new EnrollmentFacialError(
      "TOO_MANY_ATTEMPTS",
      "O cadastro facial foi temporariamente bloqueado. Solicite apoio para continuar.",
      429,
    );
  }

  if (
    falhasRecentes.length >= 3 &&
    falhasRecentes[0].atualizadoEm.getTime() > Date.now() - 60_000
  ) {
    throw new EnrollmentFacialError(
      "COOLDOWN_ACTIVE",
      "Aguarde um minuto antes de tentar novamente.",
      429,
    );
  }

  const nonce = criarNonceEnrollment();
  const desafios = criarSequenciaDesafios();
  const agora = new Date();
  const expiraEm = new Date(
    agora.getTime() + REGRAS_ENROLLMENT_FACIAL.duracaoSessaoMs,
  );

  const sessao = await prisma.$transaction(async (tx) => {
    await tx.sessaoCadastroFacial.updateMany({
      where: {
        servidorId: servidor.id,
        status: {
          in: ["INICIADA", "EM_ANDAMENTO"],
        },
      },
      data: {
        status: "CANCELADA",
      },
    });

    const criada = await tx.sessaoCadastroFacial.create({
      data: {
        servidorId: servidor.id,
        usuarioId: params.usuarioId,
        nonceHash: hashNonceEnrollment(nonce),
        sequenciaDesafios: desafios,
        consentimentoEm: agora,
        expiraEm,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: params.usuarioId,
        entidade: "SessaoCadastroFacial",
        entidadeId: criada.id,
        acao: "SESSAO_CADASTRO_FACIAL_INICIADA",
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        dadosDepois: {
          servidorId: servidor.id,
          expiraEm,
          quantidadeDesafios: desafios.length,
          consentimentoRegistrado: true,
          cadastroTerceiro: Boolean(params.servidorId),
        },
      },
    });

    return criada;
  });

  return {
    sessionId: sessao.id,
    nonce,
    expiresAt: expiraEm.toISOString(),
    challengeSequence: desafios,
  };
}
