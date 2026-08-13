import crypto from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";

const TAMANHO_MAXIMO_EVIDENCIA_BYTES = 240 * 1024;
const DATA_URL_IMAGEM_RE = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i;

type SalvarEvidenciaFacialParams = {
  tx: Prisma.TransactionClient;
  marcacaoId: string;
  imagemDataUrl?: string | null;
  autorizacaoBiometricaId?: string | null;
  amostraBiometricaId?: string | null;
  qualidade?: number | null;
  similaridade?: number | null;
  distancia?: number | null;
  metadados?: Prisma.InputJsonValue;
};

function normalizarContentType(contentType: string) {
  return contentType.toLowerCase() === "image/jpg"
    ? "image/jpeg"
    : contentType.toLowerCase();
}

function numeroFinitoOuNull(valor?: number | null) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

export function decodificarEvidenciaFacialDataUrl(
  imagemDataUrl?: string | null,
) {
  const valor = imagemDataUrl?.trim();

  if (!valor) {
    return null;
  }

  const match = valor.match(DATA_URL_IMAGEM_RE);

  if (!match) {
    return null;
  }

  const contentType = normalizarContentType(match[1]);
  const imagem = Buffer.from(match[2], "base64");

  if (imagem.length === 0 || imagem.length > TAMANHO_MAXIMO_EVIDENCIA_BYTES) {
    return null;
  }

  return {
    contentType,
    imagem,
    tamanhoBytes: imagem.length,
    hashSha256: crypto.createHash("sha256").update(imagem).digest("hex"),
  };
}

export async function salvarEvidenciaFacialMarcacao({
  tx,
  marcacaoId,
  imagemDataUrl,
  autorizacaoBiometricaId,
  amostraBiometricaId,
  qualidade,
  similaridade,
  distancia,
  metadados,
}: SalvarEvidenciaFacialParams) {
  const evidencia = decodificarEvidenciaFacialDataUrl(imagemDataUrl);

  if (!evidencia) {
    return null;
  }

  return tx.marcacaoFacialEvidencia.upsert({
    where: { marcacaoId },
    update: {
      contentType: evidencia.contentType,
      imagem: evidencia.imagem,
      tamanhoBytes: evidencia.tamanhoBytes,
      hashSha256: evidencia.hashSha256,
      autorizacaoBiometricaId: autorizacaoBiometricaId || null,
      amostraBiometricaId: amostraBiometricaId || null,
      qualidade: numeroFinitoOuNull(qualidade),
      similaridade: numeroFinitoOuNull(similaridade),
      distancia: numeroFinitoOuNull(distancia),
      metadados,
    },
    create: {
      marcacaoId,
      contentType: evidencia.contentType,
      imagem: evidencia.imagem,
      tamanhoBytes: evidencia.tamanhoBytes,
      hashSha256: evidencia.hashSha256,
      autorizacaoBiometricaId: autorizacaoBiometricaId || null,
      amostraBiometricaId: amostraBiometricaId || null,
      qualidade: numeroFinitoOuNull(qualidade),
      similaridade: numeroFinitoOuNull(similaridade),
      distancia: numeroFinitoOuNull(distancia),
      metadados,
    },
  });
}
