import { Worker, type Job } from "bullmq";

import { prisma } from "@/shared/infrastructure/database/prisma";
import type { MarcacaoRelogioPonto } from "@/modules/integracoes/domain/relogio-ponto.types";
import { capturarTodasMarcacoesRelogioPontoService } from "../services/relogios-ponto/relogio-ponto-operacoes.service";
import {
  COLETA_RELOGIO_PROGRESSIVA_QUEUE_NAME,
  coletaRelogioProgressivaConnection,
  enfileirarColetaRelogioProgressiva,
  type ColetaRelogioProgressivaJobData,
} from "../queues/coleta-relogio-progressiva-queue";

function somenteDigitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
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
        digitos ? { usuario: { cpf: digitos } } : undefined,
        texto
          ? { usuario: { matricula: { equals: texto, mode: "insensitive" } } }
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

function criarFiltroServidor(
  servidor: Awaited<ReturnType<typeof buscarServidorParaColeta>>,
) {
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

    if (cpf) {
      return cpfs.has(cpf);
    }

    return Boolean(matricula && matriculas.has(matricula));
  };
}

function coletaAutomaticaHabilitada() {
  return process.env.COLETA_RELOGIO_AUTOMATICA_ENABLED !== "false";
}

function fabricanteNormalizado(valor: string | null) {
  return valor?.trim().toUpperCase().replace(/[\s-]+/g, "_") ?? "";
}

async function listarEquipamentosParaColetaAutomatica() {
  const incluirHenry =
    process.env.COLETA_RELOGIO_AUTOMATICA_INCLUIR_HENRY === "true";

  return prisma.equipamentoBiometrico.findMany({
    where: {
      ativo: true,
      ip: { not: null },
    },
    select: {
      id: true,
      codigo: true,
      fabricante: true,
      ip: true,
    },
    orderBy: {
      codigo: "asc",
    },
  }).then((equipamentos) =>
    equipamentos.filter((equipamento) => {
      const fabricante = fabricanteNormalizado(equipamento.fabricante);

      if (!incluirHenry && fabricante === "HENRY") {
        return false;
      }

      return Boolean(fabricante);
    }),
  );
}

export function iniciarAgendadorColetaRelogioPeriodica() {
  if (!coletaAutomaticaHabilitada()) {
    console.log("[COLETA RELOGIO] Agendamento automatico desabilitado.");
    return null;
  }

  const intervaloMs = Math.max(
    Number(process.env.COLETA_RELOGIO_AUTOMATICA_INTERVALO_MS ?? "60000"),
    10000,
  );
  const quantidadePorLote = Math.max(
    Number(process.env.COLETA_RELOGIO_AUTOMATICA_QUANTIDADE_LOTE ?? "50"),
    1,
  );
  const limiteLotes = Math.max(
    Number(process.env.COLETA_RELOGIO_AUTOMATICA_LIMITE_LOTES ?? "5"),
    1,
  );
  let emExecucao = false;

  async function executarCiclo() {
    if (emExecucao) {
      return;
    }

    emExecucao = true;

    try {
      const equipamentos = await listarEquipamentosParaColetaAutomatica();

      for (const equipamento of equipamentos) {
        try {
          const job = await enfileirarColetaRelogioProgressiva({
            equipamentoId: equipamento.id,
            modo: "TODAS",
            quantidadePorLote,
            limiteLotes,
            reprocessarAoFinal: false,
          });

          console.log(
            [
              "[COLETA RELOGIO]",
              "agendada",
              equipamento.codigo,
              equipamento.ip,
              `job=${job.id}`,
            ].join(" | "),
          );
        } catch (error) {
          console.error(
            `[COLETA RELOGIO] Falha ao agendar ${equipamento.codigo}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    } catch (error) {
      console.error(
        `[COLETA RELOGIO] Falha no ciclo de agendamento: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      emExecucao = false;
    }
  }

  console.log(
    `[COLETA RELOGIO] Agendamento automatico iniciado. Intervalo=${intervaloMs}ms, lote=${quantidadePorLote}, limiteLotes=${limiteLotes}.`,
  );

  void executarCiclo();

  const timer = setInterval(() => {
    void executarCiclo();
  }, intervaloMs);

  return {
    fechar: () => clearInterval(timer),
  };
}

async function processarColetaRelogio(
  job: Job<ColetaRelogioProgressivaJobData>,
) {
  await job.updateProgress({
    percentual: 1,
    etapa: "Preparando coleta.",
    lotesExecutados: 0,
    limiteLotes: Number(job.data.limiteLotes ?? 100),
    recebidas: 0,
    criadas: 0,
    processadas: 0,
    ignoradasPorFiltro: 0,
    proximoNsr: null,
  });

  const servidor =
    job.data.modo === "SERVIDOR" && job.data.servidorBusca
      ? await buscarServidorParaColeta(job.data.servidorBusca)
      : null;

  if (job.data.modo === "SERVIDOR" && !servidor) {
    throw new Error("Servidor nao encontrado para o CPF ou matricula informada.");
  }

  const resultado = await capturarTodasMarcacoesRelogioPontoService({
    equipamentoId: job.data.equipamentoId,
    nsrInicial: job.data.nsrInicial,
    quantidadePorLote: job.data.quantidadePorLote,
    limiteLotes: job.data.limiteLotes,
    reprocessarAoFinal: job.data.reprocessarAoFinal,
    usuarioIdAuditoria: job.data.usuarioIdAuditoria,
    atualizarCursor: job.data.modo === "TODAS",
    filtroMarcacao: servidor ? criarFiltroServidor(servidor) : undefined,
    onProgress: async (progresso) => {
      await job.updateProgress(progresso);
    },
  });

  await job.updateProgress({
    percentual: 100,
    etapa: "Coleta concluida.",
    lotesExecutados: resultado.lotesExecutados,
    limiteLotes: resultado.limiteLotes,
    recebidas: resultado.recebidas,
    criadas: resultado.criadas,
    processadas: resultado.processadas,
    ignoradasPorFiltro: resultado.ignoradasPorFiltro,
    proximoNsr: resultado.proximoNsr,
  });

  return {
    ...resultado,
    servidor: servidor
      ? {
          id: servidor.id,
          nome: servidor.nomeFuncional ?? servidor.nomeCompletoSarh,
          matricula: servidor.matricula,
        }
      : null,
  };
}

export function criarColetaRelogioProgressivaWorker() {
  return new Worker<ColetaRelogioProgressivaJobData>(
    COLETA_RELOGIO_PROGRESSIVA_QUEUE_NAME,
    processarColetaRelogio,
    {
      connection: coletaRelogioProgressivaConnection,
      concurrency: Math.max(Number(process.env.COLETA_RELOGIO_CONCURRENCY ?? "1"), 1),
    },
  );
}
