import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  POSES_AMOSTRA_FACIAL,
  type ConclusaoEnrollmentFacialInput,
  type ConclusaoEnrollmentFacialResultado,
} from "../../domain/biometria-facial.types";
import { REGRAS_ENROLLMENT_FACIAL } from "../../domain/biometria-facial.rules";
import type { DesafioFacial } from "../../domain/challenge.types";
import { buscarSessaoCadastroFacial } from "../../infrastructure/repositories/biometria.repository";
import {
  criptografarTemplateFacial,
  hashTemplateFacial,
} from "../../infrastructure/services/biometria-facial-crypto.service";
import { nonceCorresponde } from "../../infrastructure/services/challenge.service";
import { validarResultadoLiveness } from "../../infrastructure/services/liveness.service";
import { calcularTemplateMedio } from "../services/comparar-template-facial.service";
import { BIOMETRIA_FACIAL_THRESHOLDS } from "../services/biometria-facial-config";
import { EnrollmentFacialError } from "./enrollment.error";

export async function concluirCadastroFacial(
  usuarioId: string,
  input: ConclusaoEnrollmentFacialInput & { servidorId?: string },
): Promise<ConclusaoEnrollmentFacialResultado> {
  const sessao = await buscarSessaoCadastroFacial({
    sessaoId: input.sessionId,
    usuarioId,
  });

  if (!sessao) {
    throw new EnrollmentFacialError(
      "SESSION_NOT_FOUND",
      "A sessão de cadastro facial não foi localizada.",
      404,
    );
  }

  if (input.servidorId && sessao.servidorId !== input.servidorId) {
    throw new EnrollmentFacialError(
      "SESSION_SERVER_MISMATCH",
      "A sessão de cadastro facial não pertence ao servidor informado.",
      403,
    );
  }

  if (!["INICIADA", "EM_ANDAMENTO"].includes(sessao.status)) {
    throw new EnrollmentFacialError(
      "SESSION_ALREADY_USED",
      "Esta sessão de cadastro facial não pode mais ser utilizada.",
      409,
    );
  }

  if (sessao.expiraEm.getTime() <= Date.now()) {
    await prisma.sessaoCadastroFacial.update({
      where: { id: sessao.id },
      data: { status: "EXPIRADA" },
    });

    throw new EnrollmentFacialError(
      "SESSION_EXPIRED",
      "A sessão de cadastro expirou. Inicie novamente o processo.",
      410,
    );
  }

  if (!nonceCorresponde(input.nonce, sessao.nonceHash)) {
    throw new EnrollmentFacialError(
      "INVALID_NONCE",
      "Não foi possível validar a sessão de cadastro facial.",
      403,
    );
  }

  const poses = new Set(input.amostras.map((item) => item.pose));
  const amostrasValidas =
    POSES_AMOSTRA_FACIAL.every((pose) => poses.has(pose)) &&
    input.amostras.every(
      (item) =>
        item.qualidade >= REGRAS_ENROLLMENT_FACIAL.minQualidadeAmostra,
    );

  if (!amostrasValidas) {
    await reprovarSessao(sessao.id, usuarioId, "AMOSTRAS_INVALIDAS");
    throw new EnrollmentFacialError(
      "SAMPLES_REJECTED",
      "Não conseguimos capturar seu rosto com qualidade suficiente. Melhore a iluminação e centralize o rosto.",
    );
  }

  const desafiosEsperados = sessao.sequenciaDesafios as unknown as DesafioFacial[];
  const liveness = validarResultadoLiveness({
    desafiosEsperados,
    resultados: input.desafios,
    passivo: input.livenessPassivo,
  });

  if (!liveness.aprovado) {
    await reprovarSessao(sessao.id, usuarioId, "LIVENESS_REPROVADO", {
      score: liveness.score,
      desafiosAprovados: liveness.desafiosAprovados,
      totalDesafios: liveness.totalDesafios,
      diagnostico: liveness.diagnostico,
      metricasPassivas: liveness.passivo,
    });
    throw new EnrollmentFacialError(
      "LIVENESS_FAILED",
      "Não foi possível confirmar a prova de vida. Tente novamente olhando para a câmera em um ambiente bem iluminado.",
    );
  }

  const templateMedio = calcularTemplateMedio(
    input.amostras.map((item) => item.template),
  );
  const templateSeguro = criptografarTemplateFacial(templateMedio);
  const qualidadeMedia =
    input.amostras.reduce((total, item) => total + item.qualidade, 0) /
    input.amostras.length;

  return prisma.$transaction(async (tx) => {
    const anterior = await tx.biometriaFacialServidor.findUnique({
      where: { servidorId: sessao.servidorId },
    });
    const biometria = await tx.biometriaFacialServidor.upsert({
      where: { servidorId: sessao.servidorId },
      update: {
        status: "ATIVO",
        algoritmo: "human-face-description",
        versaoAlgoritmo: "human-3.3-browser",
        template: [],
        templateCriptografado: templateSeguro.conteudo,
        templateIv: templateSeguro.iv,
        templateTag: templateSeguro.tag,
        templateHash: templateSeguro.hash,
        templateDimensao: templateMedio.length,
        qualidadeMedia,
        amostrasQuantidade: input.amostras.length,
        limiarDistancia: BIOMETRIA_FACIAL_THRESHOLDS.limiarDistanciaCosseno,
        termoAceiteEm: sessao.consentimentoEm,
        atualizadoPorUsuarioId: usuarioId,
        revogadoEm: null,
        revogadoPorUsuarioId: null,
      },
      create: {
        servidorId: sessao.servidorId,
        status: "ATIVO",
        algoritmo: "human-face-description",
        versaoAlgoritmo: "human-3.3-browser",
        template: [],
        templateCriptografado: templateSeguro.conteudo,
        templateIv: templateSeguro.iv,
        templateTag: templateSeguro.tag,
        templateHash: templateSeguro.hash,
        templateDimensao: templateMedio.length,
        qualidadeMedia,
        amostrasQuantidade: input.amostras.length,
        limiarDistancia: BIOMETRIA_FACIAL_THRESHOLDS.limiarDistanciaCosseno,
        termoAceiteEm: sessao.consentimentoEm,
        cadastradoPorUsuarioId: usuarioId,
        atualizadoPorUsuarioId: usuarioId,
      },
    });

    const amostrasCriadas = await tx.amostraBiometricaFacial.createMany({
      data: input.amostras.map((amostra) => ({
        biometriaId: biometria.id,
        servidorId: sessao.servidorId,
        tipo: "CADASTRO",
        templateHash: hashTemplateFacial(amostra.template),
        qualidade: amostra.qualidade,
        validada: true,
        criadoPorUsuarioId: usuarioId,
        metadados: {
          pose: amostra.pose,
          scoreDeteccao: amostra.scoreDeteccao,
          timestamp: amostra.timestamp,
          hashFrame: amostra.hashFrame,
          sessaoId: sessao.id,
        },
      })),
    });

    if (amostrasCriadas.count !== input.amostras.length) {
      throw new EnrollmentFacialError(
        "ENROLLMENT_NOT_CONSOLIDATED",
        "O cadastro facial foi processado, mas as amostras não foram consolidadas. Tente novamente.",
        500,
      );
    }

    await tx.sessaoCadastroFacial.update({
      where: { id: sessao.id },
      data: {
        status: "CONCLUIDA",
        concluidaEm: new Date(),
        scoreLiveness: liveness.score,
        qualidadeMedia,
        metadadosResultado: {
          desafiosAprovados: liveness.desafiosAprovados,
          framesAnalisados: liveness.passivo.framesAnalisados,
          modelo: "human-3.3-browser",
          ...input.metadados,
        },
      },
    });

    const biometriaConsolidada = await tx.biometriaFacialServidor.findFirst({
      where: {
        id: biometria.id,
        servidorId: sessao.servidorId,
        status: "ATIVO",
        templateHash: templateSeguro.hash,
        templateCriptografado: {
          not: null,
        },
        templateIv: {
          not: null,
        },
        templateTag: {
          not: null,
        },
        amostrasQuantidade: input.amostras.length,
      },
      select: {
        id: true,
      },
    });

    if (!biometriaConsolidada) {
      throw new EnrollmentFacialError(
        "ENROLLMENT_NOT_CONSOLIDATED",
        "O cadastro facial foi processado, mas não ficou ativo para o servidor. Tente novamente.",
        500,
      );
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId,
        entidade: "BiometriaFacialServidor",
        entidadeId: biometria.id,
        acao: anterior
          ? "BIOMETRIA_FACIAL_RECADASTRADA"
          : "CADASTRO_APROVADO",
        dadosAntes: anterior
          ? {
              status: anterior.status,
              templateHash: anterior.templateHash,
              atualizadoEm: anterior.atualizadoEm,
            }
          : undefined,
        dadosDepois: {
          servidorId: sessao.servidorId,
          status: "ATIVO",
          sessaoId: sessao.id,
          templateDimensao: templateMedio.length,
          amostrasQuantidade: input.amostras.length,
          qualidadeMedia,
          livenessAprovado: true,
        },
      },
    });

    return {
      biometriaId: biometria.id,
      qualidadeMedia,
      liveness,
      recadastro: Boolean(anterior),
    };
  });
}

async function reprovarSessao(
  sessaoId: string,
  usuarioId: string,
  motivo: string,
  diagnostico?: Record<string, unknown>,
) {
  await prisma.$transaction([
    prisma.sessaoCadastroFacial.update({
      where: { id: sessaoId },
      data: {
        status: "REPROVADA",
        concluidaEm: new Date(),
        tentativas: { increment: 1 },
        metadadosResultado: { motivo, ...diagnostico },
      },
    }),
    prisma.auditoriaEvento.create({
      data: {
        usuarioId,
        entidade: "SessaoCadastroFacial",
        entidadeId: sessaoId,
        acao: motivo,
        dadosDepois: { aprovado: false },
      },
    }),
  ]);
}
