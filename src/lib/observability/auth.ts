import { timingSafeEqual } from "node:crypto";

import { obterSegredoDeEnvOuArquivo } from "./secrets";

export function obterMetricsTokenConfigurado() {
  return obterSegredoDeEnvOuArquivo(
    "SECP_METRICS_TOKEN",
    "SECP_METRICS_TOKEN_FILE",
  );
}

export function autorizarBearerToken(
  authorizationHeader: string | null,
  tokenEsperado = obterMetricsTokenConfigurado(),
) {
  if (!tokenEsperado || !authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }

  const tokenRecebido = authorizationHeader.slice("Bearer ".length).trim();
  const esperado = Buffer.from(tokenEsperado);
  const recebido = Buffer.from(tokenRecebido);

  if (esperado.length !== recebido.length) {
    return false;
  }

  return timingSafeEqual(esperado, recebido);
}

