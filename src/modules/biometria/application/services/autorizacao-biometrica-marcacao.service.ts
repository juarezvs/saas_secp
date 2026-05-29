import crypto from "node:crypto";

import { prisma } from "@/shared/infrastructure/database/prisma";

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

export async function criarAutorizacaoBiometricaMarcacao(params: {
  servidorId: string;
  similaridade: number;
  distancia: number;
}) {
  const token = crypto.randomUUID();
  const tokenHash = gerarHashToken(token);

  const expiraEm = new Date(Date.now() + 2 * 60 * 1000);

  const autorizacao = await prisma.autorizacaoBiometricaMarcacao.create({
    data: {
      servidorId: params.servidorId,
      tokenHash,
      expiraEm,
      metadados: {
        similaridade: params.similaridade,
        distancia: params.distancia,
        origem: "VALIDACAO_FACIAL_MARCACAO",
      },
    },
  });

  return {
    id: autorizacao.id,
    token,
    expiraEm,
  };
}

export async function validarAutorizacaoBiometricaMarcacao(params: {
  servidorId: string;
  autorizacaoId: string;
  token: string;
}) {
  if (!params.autorizacaoId || !params.token) {
    return {
      valida: false,
    };
  }

  const autorizacao = await prisma.autorizacaoBiometricaMarcacao.findFirst({
    where: {
      id: params.autorizacaoId,
      servidorId: params.servidorId,
      marcacaoId: null,
      expiraEm: {
        gt: new Date(),
      },
    },
  });

  if (!autorizacao) {
    return {
      valida: false,
    };
  }

  const tokenHash = gerarHashToken(params.token);

  return {
    valida: tokenHash === autorizacao.tokenHash,
  };
}

export async function consumirAutorizacaoBiometricaMarcacao(params: {
  tx: TransactionClient;
  autorizacaoId: string;
  marcacaoId: string;
}) {
  await params.tx.autorizacaoBiometricaMarcacao.update({
    where: {
      id: params.autorizacaoId,
    },
    data: {
      marcacaoId: params.marcacaoId,
    },
  });
}

function gerarHashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
