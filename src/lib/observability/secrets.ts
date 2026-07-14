import { readFileSync } from "node:fs";

import { logger } from "./logger";

export function obterSegredoDeEnvOuArquivo(envName: string, fileEnvName: string) {
  const valorDireto = process.env[envName]?.trim();

  if (valorDireto) {
    return valorDireto;
  }

  const caminhoArquivo = process.env[fileEnvName]?.trim();

  if (!caminhoArquivo) {
    return null;
  }

  try {
    const conteudo = readFileSync(caminhoArquivo, "utf8").trim();
    return conteudo || null;
  } catch (error) {
    logger.error("Nao foi possivel ler segredo de arquivo", {
      fileEnvName,
      error,
    });
    return null;
  }
}
