import { Queue } from "bullmq";

import type { TipoRelatorioGerencial } from "../../infrastructure/repositories/relatorios-gerenciais.repository";

export const RELATORIO_EXPORTACAO_QUEUE_NAME = "relatorio-exportacao";

export type RelatorioExportacaoFormato = "PDF" | "CSV";

export type RelatorioExportacaoTipo =
  | "GERENCIAL"
  | "LOTACOES_CHEFIAS"
  | "HOMOLOGACAO"
  | "ESPELHO_PONTO"
  | "BANCO_HORAS"
  | "BOLETIM_FREQUENCIA";

export type RelatorioExportacaoJobData = {
  tipo: RelatorioExportacaoTipo;
  formato: RelatorioExportacaoFormato;
  usuarioId: string;
  permissoes: string[];
  filtros: Record<string, string | null>;
  relatorioGerencialTipo?: TipoRelatorioGerencial;
};

export type RelatorioExportacaoJobResult = {
  arquivo: string;
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number;
  finalizadoEm: string;
};

export const relatorioExportacaoConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

export const relatorioExportacaoQueue =
  new Queue<RelatorioExportacaoJobData>(RELATORIO_EXPORTACAO_QUEUE_NAME, {
    connection: relatorioExportacaoConnection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 10000,
      },
      removeOnComplete: {
        age: 60 * 60 * 24 * 3,
        count: 1000,
      },
      removeOnFail: {
        age: 60 * 60 * 24 * 7,
        count: 2000,
      },
    },
  });

export async function enfileirarRelatorioExportacao(
  data: RelatorioExportacaoJobData,
) {
  return relatorioExportacaoQueue.add("gerar-relatorio-exportacao", data);
}
