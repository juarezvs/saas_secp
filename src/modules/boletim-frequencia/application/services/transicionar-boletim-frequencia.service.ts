import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  STATUS_ORIGEM,
  type TransicaoBoletim,
  validarTransicaoBoletimFrequencia,
} from "./validar-transicao-boletim-frequencia";

export async function encaminharBoletimFrequenciaService(params: {
  boletimId: string;
  usuarioId: string;
  processoSei?: string;
  numeroSei?: string;
  observacao?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const boletimAtual = await tx.boletimFrequencia.findUnique({
      where: { id: params.boletimId },
    });

    if (!boletimAtual) {
      throw new Error("Boletim de frequência não encontrado.");
    }

    validarTransicaoBoletimFrequencia(
      boletimAtual.status,
      "ENCAMINHADO_SECAP",
    );

    const processoSei = params.processoSei || boletimAtual.processoSei;
    const numeroSei = params.numeroSei || boletimAtual.numeroSei;
    const observacao = params.observacao || boletimAtual.observacao;

    const atualizado = await tx.boletimFrequencia.updateMany({
      where: {
        id: params.boletimId,
        status: "GERADO",
      },
      data: {
        status: "ENCAMINHADO_SECAP",
        processoSei,
        numeroSei,
        observacao,
        encaminhadoPorUsuarioId: params.usuarioId,
        encaminhadoEm: new Date(),
      },
    });

    if (atualizado.count !== 1) {
      throw new Error(
        "O boletim foi atualizado por outro usuário. Recarregue a página.",
      );
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: params.usuarioId,
        entidade: "BoletimFrequencia",
        entidadeId: params.boletimId,
        acao: "BOLETIM_FREQUENCIA_ENCAMINHADO_SECAP",
        dadosAntes: {
          status: boletimAtual.status,
          processoSei: boletimAtual.processoSei,
          numeroSei: boletimAtual.numeroSei,
        },
        dadosDepois: {
          status: "ENCAMINHADO_SECAP",
          processoSei,
          numeroSei,
          observacao,
        },
      },
    });
  });
}

export async function registrarEtapaSecapBoletimFrequenciaService(params: {
  boletimId: string;
  usuarioId: string;
  status: Extract<TransicaoBoletim, "RECEBIDO_SECAP" | "CONFERIDO">;
  observacao?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const boletimAtual = await tx.boletimFrequencia.findUnique({
      where: { id: params.boletimId },
    });

    if (!boletimAtual) {
      throw new Error("Boletim de frequência não encontrado.");
    }

    validarTransicaoBoletimFrequencia(boletimAtual.status, params.status);

    const atualizado = await tx.boletimFrequencia.updateMany({
      where: {
        id: params.boletimId,
        status: STATUS_ORIGEM[params.status],
      },
      data: {
        status: params.status,
        observacao: params.observacao || boletimAtual.observacao,
        ...(params.status === "RECEBIDO_SECAP"
          ? {
              recebidoPorUsuarioId: params.usuarioId,
              recebidoEm: new Date(),
            }
          : {}),
      },
    });

    if (atualizado.count !== 1) {
      throw new Error(
        "O boletim foi atualizado por outro usuário. Recarregue a página.",
      );
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: params.usuarioId,
        entidade: "BoletimFrequencia",
        entidadeId: params.boletimId,
        acao:
          params.status === "CONFERIDO"
            ? "BOLETIM_FREQUENCIA_CONFERIDO"
            : "BOLETIM_FREQUENCIA_RECEBIDO_SECAP",
        dadosAntes: {
          status: boletimAtual.status,
        },
        dadosDepois: {
          status: params.status,
          observacao: params.observacao || null,
        },
      },
    });
  });
}
