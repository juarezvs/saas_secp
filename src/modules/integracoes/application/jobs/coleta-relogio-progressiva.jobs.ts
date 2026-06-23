import { randomUUID } from "node:crypto";

import { prisma } from "@/shared/infrastructure/database/prisma";
import type { MarcacaoRelogioPonto } from "@/modules/integracoes/domain/relogio-ponto.types";
import { capturarTodasMarcacoesRelogioPontoService } from "../services/relogios-ponto/relogio-ponto-operacoes.service";

export type ColetaRelogioProgressivaModo = "TODAS" | "SERVIDOR";

export type ColetaRelogioProgressivaJob = {
  id: string;
  status: "AGUARDANDO" | "PROCESSANDO" | "CONCLUIDO" | "ERRO" | "CANCELADO";
  modo: ColetaRelogioProgressivaModo;
  equipamentoId: string;
  criadoEm: string;
  atualizadoEm: string;
  progresso: {
    percentual: number;
    etapa: string;
    lotesExecutados: number;
    limiteLotes: number;
    recebidas: number;
    criadas: number;
    processadas: number;
    ignoradasPorFiltro: number;
    proximoNsr: string | null;
  };
  resultado?: unknown;
  erro?: string | null;
};

type IniciarColetaParams = {
  equipamentoId: string;
  modo: ColetaRelogioProgressivaModo;
  nsrInicial?: string | number | null;
  quantidadePorLote?: number | null;
  limiteLotes?: number | null;
  reprocessarAoFinal?: boolean | null;
  servidorBusca?: string | null;
  usuarioIdAuditoria?: string | null;
};

type ColetaJobsGlobal = typeof globalThis & {
  __secpColetaRelogioJobs?: Map<string, ColetaRelogioProgressivaJob>;
};

function jobsStore() {
  const globalJobs = globalThis as ColetaJobsGlobal;
  globalJobs.__secpColetaRelogioJobs ??= new Map();
  return globalJobs.__secpColetaRelogioJobs;
}

function somenteDigitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
}

function atualizarJob(
  jobId: string,
  patch: Partial<Omit<ColetaRelogioProgressivaJob, "id" | "criadoEm" | "progresso">> & {
    progresso?: Partial<ColetaRelogioProgressivaJob["progresso"]>;
  },
) {
  const store = jobsStore();
  const atual = store.get(jobId);
  if (!atual) return;

  store.set(jobId, {
    ...atual,
    ...patch,
    atualizadoEm: new Date().toISOString(),
    progresso: {
      ...atual.progresso,
      ...(patch.progresso ?? {}),
    },
  });
}

function jobCancelado(jobId: string) {
  return jobsStore().get(jobId)?.status === "CANCELADO";
}

function garantirJobNaoCancelado(jobId: string) {
  if (jobCancelado(jobId)) {
    throw new Error("COLETA_CANCELADA");
  }
}

async function buscarServidorParaColeta(busca: string) {
  const texto = busca.trim();
  const digitos = somenteDigitos(texto);

  return prisma.servidor.findFirst({
    where: {
      ativo: true,
      OR: [
        digitos ? { cpf: digitos } : undefined,
        texto ? { matricula: { equals: texto, mode: "insensitive" } } : undefined,
        digitos
          ? {
              usuario: {
                cpf: digitos,
              },
            }
          : undefined,
        texto
          ? {
              usuario: {
                matricula: { equals: texto, mode: "insensitive" },
              },
            }
          : undefined,
      ].filter(Boolean) as never,
    },
    select: {
      id: true,
      nomeFuncional: true,
      nomeCompletoSarh: true,
      cpf: true,
      matricula: true,
      usuario: {
        select: {
          cpf: true,
          matricula: true,
        },
      },
    },
  });
}

function criarFiltroServidor(servidor: Awaited<ReturnType<typeof buscarServidorParaColeta>>) {
  const cpfs = new Set(
    [servidor?.cpf, servidor?.usuario?.cpf].map(somenteDigitos).filter(Boolean),
  );
  const matriculas = new Set(
    [servidor?.matricula, servidor?.usuario?.matricula]
      .map((item) => item?.trim().toLowerCase())
      .filter((item): item is string => Boolean(item)),
  );

  return (marcacao: MarcacaoRelogioPonto) => {
    const cpf = somenteDigitos(marcacao.cpf);
    const matricula = marcacao.matricula?.trim().toLowerCase();

    return Boolean((cpf && cpfs.has(cpf)) || (matricula && matriculas.has(matricula)));
  };
}

async function executarJob(jobId: string, params: IniciarColetaParams) {
  try {
    atualizarJob(jobId, {
      status: "PROCESSANDO",
      progresso: {
        percentual: 1,
        etapa: "Preparando coleta.",
        lotesExecutados: 0,
        limiteLotes: Number(params.limiteLotes ?? 100),
        recebidas: 0,
        criadas: 0,
        processadas: 0,
        ignoradasPorFiltro: 0,
        proximoNsr: null,
      },
    });

    const servidor =
      params.modo === "SERVIDOR" && params.servidorBusca
        ? await buscarServidorParaColeta(params.servidorBusca)
        : null;

    if (params.modo === "SERVIDOR" && !servidor) {
      throw new Error("Servidor nao encontrado para o CPF ou matricula informada.");
    }

    garantirJobNaoCancelado(jobId);

    const resultado = await capturarTodasMarcacoesRelogioPontoService({
      equipamentoId: params.equipamentoId,
      nsrInicial: params.nsrInicial,
      quantidadePorLote: params.quantidadePorLote,
      limiteLotes: params.limiteLotes,
      reprocessarAoFinal: params.reprocessarAoFinal,
      usuarioIdAuditoria: params.usuarioIdAuditoria,
      atualizarCursor: params.modo === "TODAS",
      filtroMarcacao: servidor ? criarFiltroServidor(servidor) : undefined,
      onProgress: (progresso) => {
        garantirJobNaoCancelado(jobId);
        atualizarJob(jobId, {
          progresso: {
            percentual: progresso.percentual,
            etapa: progresso.etapa,
            lotesExecutados: progresso.lotesExecutados,
            limiteLotes: progresso.limiteLotes,
            recebidas: progresso.recebidas,
            criadas: progresso.criadas,
            processadas: progresso.processadas,
            ignoradasPorFiltro: progresso.ignoradasPorFiltro,
            proximoNsr: progresso.proximoNsr,
          },
        });
      },
    });

    if (jobCancelado(jobId)) {
      return;
    }

    atualizarJob(jobId, {
      status: "CONCLUIDO",
      resultado: {
        ...resultado,
        servidor: servidor
          ? {
              id: servidor.id,
              nome: servidor.nomeFuncional ?? servidor.nomeCompletoSarh,
              matricula: servidor.matricula,
            }
          : null,
      },
      progresso: {
        percentual: 100,
        etapa: "Coleta concluida.",
        lotesExecutados: resultado.lotesExecutados,
        limiteLotes: resultado.limiteLotes,
        recebidas: resultado.recebidas,
        criadas: resultado.criadas,
        processadas: resultado.processadas,
        ignoradasPorFiltro: resultado.ignoradasPorFiltro,
        proximoNsr: resultado.proximoNsr,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "COLETA_CANCELADA") {
      atualizarJob(jobId, {
        status: "CANCELADO",
        erro: null,
        progresso: {
          etapa: "Coleta cancelada pelo usuario.",
        },
      });
      return;
    }

    atualizarJob(jobId, {
      status: "ERRO",
      erro: error instanceof Error ? error.message : "Falha na coleta progressiva.",
      progresso: {
        etapa:
          error instanceof Error
            ? `Coleta interrompida: ${error.message}`
            : "Coleta interrompida por falha inesperada.",
      },
    });
  }
}

export function iniciarColetaRelogioProgressiva(params: IniciarColetaParams) {
  const job: ColetaRelogioProgressivaJob = {
    id: randomUUID(),
    status: "AGUARDANDO",
    modo: params.modo,
    equipamentoId: params.equipamentoId,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    erro: null,
    progresso: {
      percentual: 0,
      etapa: "Aguardando inicio.",
      lotesExecutados: 0,
      limiteLotes: Number(params.limiteLotes ?? 100),
      recebidas: 0,
      criadas: 0,
      processadas: 0,
      ignoradasPorFiltro: 0,
      proximoNsr: null,
    },
  };

  jobsStore().set(job.id, job);
  void executarJob(job.id, params);

  return job;
}

export function obterColetaRelogioProgressiva(jobId: string) {
  return jobsStore().get(jobId) ?? null;
}

export function cancelarColetaRelogioProgressiva(jobId: string) {
  const job = jobsStore().get(jobId);

  if (!job) {
    return null;
  }

  if (["CONCLUIDO", "ERRO", "CANCELADO"].includes(job.status)) {
    return job;
  }

  atualizarJob(jobId, {
    status: "CANCELADO",
    erro: null,
    progresso: {
      etapa: "Cancelamento solicitado. A coleta sera interrompida ao final do lote atual.",
    },
  });

  return jobsStore().get(jobId) ?? job;
}

export function listarColetasRelogioProgressivasAtivas() {
  return Array.from(jobsStore().values()).filter((job) =>
    ["AGUARDANDO", "PROCESSANDO"].includes(job.status),
  );
}
