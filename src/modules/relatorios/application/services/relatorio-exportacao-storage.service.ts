import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RelatorioExportacaoJobResult } from "../queues/relatorio-exportacao-queue";

const DIRETORIO_RELATORIOS = path.resolve(
  process.cwd(),
  ".storage",
  "relatorios",
);

function nomeSeguro(valor: string) {
  return valor.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function caminhoRelatorioExportado(jobId: string, nomeArquivo: string) {
  return path.join(DIRETORIO_RELATORIOS, `${nomeSeguro(jobId)}-${nomeSeguro(nomeArquivo)}`);
}

export async function salvarRelatorioExportado(params: {
  jobId: string;
  nomeArquivo: string;
  contentType: string;
  conteudo: Buffer | Uint8Array | string;
}): Promise<RelatorioExportacaoJobResult> {
  await mkdir(DIRETORIO_RELATORIOS, { recursive: true });

  const arquivo = caminhoRelatorioExportado(params.jobId, params.nomeArquivo);
  await writeFile(arquivo, params.conteudo);
  const info = await stat(arquivo);

  return {
    arquivo,
    nomeArquivo: params.nomeArquivo,
    contentType: params.contentType,
    tamanhoBytes: info.size,
    finalizadoEm: new Date().toISOString(),
  };
}

export async function lerRelatorioExportado(
  resultado: RelatorioExportacaoJobResult,
) {
  return readFile(resultado.arquivo);
}
