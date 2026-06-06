import crypto from "node:crypto";

import { REGRAS_ENROLLMENT_FACIAL } from "../../domain/biometria-facial.rules";
import {
  TIPOS_DESAFIO_FACIAL,
  type DesafioFacial,
} from "../../domain/challenge.types";

export function criarNonceEnrollment() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashNonceEnrollment(nonce: string) {
  return crypto.createHash("sha256").update(nonce).digest("hex");
}

export function criarSequenciaDesafios(): DesafioFacial[] {
  const tipos = [...TIPOS_DESAFIO_FACIAL];

  for (let index = tipos.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [tipos[index], tipos[swapIndex]] = [tipos[swapIndex], tipos[index]];
  }

  return tipos
    .slice(0, REGRAS_ENROLLMENT_FACIAL.quantidadeDesafios)
    .map((tipo, index) => ({
      id: crypto.randomUUID(),
      tipo,
      ordem: index + 1,
      tempoLimiteMs: REGRAS_ENROLLMENT_FACIAL.tempoDesafioMs,
    }));
}

export function nonceCorresponde(nonce: string, nonceHash: string) {
  const recebido = Buffer.from(hashNonceEnrollment(nonce), "hex");
  const esperado = Buffer.from(nonceHash, "hex");

  return (
    recebido.length === esperado.length &&
    crypto.timingSafeEqual(recebido, esperado)
  );
}
