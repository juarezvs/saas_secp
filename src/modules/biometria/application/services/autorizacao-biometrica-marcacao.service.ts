import crypto from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

function gerarTokenBiometrico() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function criarAutorizacaoBiometricaMarcacao(params: {
  servidorId: string;
  amostraId?: string | null;
  origem?: string;
  metadados?: unknown;
  validadeMinutos?: number;
  tx?: Tx;
}) {
  const client = params.tx ?? prisma;

  const token = gerarTokenBiometrico();
  const tokenHash = hashToken(token);

  const expiraEm = new Date();
  expiraEm.setMinutes(expiraEm.getMinutes() + (params.validadeMinutos ?? 5));

  const autorizacao = await client.autorizacaoBiometricaMarcacao.create({
    data: {
      servidor: {
        connect: {
          id: params.servidorId,
        },
      },
      amostra: params.amostraId
        ? {
            connect: {
              id: params.amostraId,
            },
          }
        : undefined,
      tokenHash,
      status: "PENDENTE",
      expiraEm,
      origem: params.origem ?? "VALIDACAO_FACIAL_WEB",
      metadados: params.metadados ?? undefined,
    },
  });

  return {
    autorizacao,
    token,
  };
}

export async function validarAutorizacaoBiometricaMarcacao(params: {
  servidorId: string;
  autorizacaoId: string;
  token: string;
  tx?: Tx;
}) {
  const client = params.tx ?? prisma;

  const autorizacao = await client.autorizacaoBiometricaMarcacao.findUnique({
    where: {
      id: params.autorizacaoId,
    },
  });

  if (!autorizacao) {
    return {
      valida: false,
      mensagem: "Autorização biométrica não encontrada.",
    };
  }

  if (autorizacao.servidorId !== params.servidorId) {
    return {
      valida: false,
      mensagem: "Autorização biométrica não pertence ao servidor autenticado.",
    };
  }

  if (autorizacao.status !== "PENDENTE") {
    return {
      valida: false,
      mensagem: "Autorização biométrica já foi utilizada ou cancelada.",
    };
  }

  if (autorizacao.expiraEm < new Date()) {
    await client.autorizacaoBiometricaMarcacao.update({
      where: {
        id: autorizacao.id,
      },
      data: {
        status: "EXPIRADA",
      },
    });

    return {
      valida: false,
      mensagem: "Autorização biométrica expirada. Valide a face novamente.",
    };
  }

  const tokenHash = hashToken(params.token);

  if (tokenHash !== autorizacao.tokenHash) {
    return {
      valida: false,
      mensagem: "Token de autorização biométrica inválido.",
    };
  }

  return {
    valida: true,
    autorizacao,
  };
}

export async function consumirAutorizacaoBiometricaMarcacao(params: {
  autorizacaoId: string;
  marcacaoId: string;
  tx?: Tx;
}) {
  const client = params.tx ?? prisma;

  return client.autorizacaoBiometricaMarcacao.update({
    where: {
      id: params.autorizacaoId,
    },
    data: {
      status: "UTILIZADA",
      utilizadaEm: new Date(),
      marcacaoId: params.marcacaoId,
    },
  });
}
