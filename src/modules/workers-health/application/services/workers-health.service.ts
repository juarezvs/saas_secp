import type { Job, Queue } from "bullmq";

import { afdQueue } from "@/modules/afd/application/queues/afd-queue";
import { calendarioInstitucionalQueue } from "@/modules/calendario-institucional/application/queues/calendario-institucional-queue";
import { obterStatusHenryColetaWorker } from "@/modules/integracoes/application/workers/henry-coleta-worker-runtime";
import { obterStatusHenryOnlineWorker } from "@/modules/integracoes/application/workers/henry-online-worker-runtime";
import { obterSarhLoginSyncQueue } from "@/modules/integracoes/sarh/application/queues/sarh-login-sync-queue";
import { obterSarhSyncQueue } from "@/modules/integracoes/sarh/application/queues/sarh-sync-queue";
import { coletaRelogioProgressivaQueue } from "@/modules/integracoes/application/queues/coleta-relogio-progressiva-queue";
import { reprocessamentoGlobalQueue } from "@/modules/marcacoes-brutas/application/queues/reprocessamento-global-queue";
import { recalcularRegulamentacaoPontoQueue } from "@/modules/regulamentacao-ponto/application/queues/recalcular-regulamentacao-ponto-queue";
import { relatorioExportacaoQueue } from "@/modules/relatorios/application/queues/relatorio-exportacao-queue";
import {
  obterSaudeContainerDocker,
  type DockerContainerHealth,
} from "./docker-container-health.service";

export type WorkerHealthStatus = "online" | "parado" | "atencao";

type WorkerTipo = "fila" | "continuo";

type WorkerMetadata = {
  id: string;
  nome: string;
  tipo: WorkerTipo;
  fila?: Queue;
  globalKey?: string;
  envFlag?: string;
  containerName?: string;
  descricao: string;
  ondeUsa: string[];
  quandoUsa: string[];
  detalheOperacional: string;
};

type QueueCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
};

type WorkerResumoInterno = {
  status: WorkerHealthStatus;
  motivoAtencao: string | null;
  counts?: QueueCounts;
  ultimaAtividadeEm?: Date | null;
  logs?: WorkerHealthLog[];
};

export type WorkerHealthResumo = {
  id: string;
  nome: string;
  tipo: WorkerTipo;
  status: WorkerHealthStatus;
  statusLabel: string;
  descricao: string;
  ondeUsa: string[];
  quandoUsa: string[];
  detalheOperacional: string;
  queueName?: string;
  counts?: QueueCounts;
  container?: DockerContainerHealth;
  ativoNoProcesso: boolean;
  ultimaAtividadeEm?: Date | null;
  motivoAtencao?: string | null;
};

export type WorkerHealthLog = {
  id: string;
  data?: Date | null;
  estado: string;
  nome?: string;
  mensagem: string;
  progresso?: unknown;
  dados?: unknown;
};

export type WorkerHealthDetalhe = WorkerHealthResumo & {
  logs: WorkerHealthLog[];
};

const WORKERS: WorkerMetadata[] = [
  {
    id: "afd",
    nome: "AFD",
    tipo: "fila",
    fila: afdQueue as Queue,
    globalKey: "__secpAfdWorker",
    envFlag: "AFD_AUTO_WORKER",
    containerName: "secp-worker-afd",
    descricao: "Processa arquivos AFD importados dos equipamentos de ponto.",
    ondeUsa: ["/afd", "API /api/afd/upload"],
    quandoUsa: [
      "Ao enviar arquivos AFD na rotina Administração > AFD.",
      "Cada arquivo recebido é enfileirado para processamento assíncrono.",
    ],
    detalheOperacional:
      "Atualiza importações AFD, arquivos recebidos e marcações brutas associadas.",
  },
  {
    id: "reprocessamento-global",
    nome: "Reprocessamento global",
    tipo: "fila",
    fila: reprocessamentoGlobalQueue as Queue,
    globalKey: "__secpReprocessamentoGlobalWorker",
    envFlag: "REPROCESSAMENTO_GLOBAL_AUTO_WORKER",
    containerName: "secp-worker-reprocessamento",
    descricao: "Reprocessa marcações brutas pendentes e recalcula competências.",
    ondeUsa: ["/marcacoes-brutas", "API /api/marcacoes-brutas/reprocessar-todos"],
    quandoUsa: [
      "Ao clicar no botão de reprocessamento global das marcações brutas.",
      "Evita concorrência mantendo um job global por vez.",
    ],
    detalheOperacional:
      "Percorre pendências, processa marcações e recalcula reflexos de apuração e banco de horas.",
  },
  {
    id: "henry-coleta",
    nome: "Equipamentos biometricos - coleta Henry",
    tipo: "continuo",
    envFlag: "HENRY_COLETA_AUTO_WORKER",
    containerName: "secp-worker-henry-coleta",
    descricao: "Coleta marcações diretamente dos relógios Henry ativos.",
    ondeUsa: ["Equipamentos biométricos", "Relógios Henry cadastrados"],
    quandoUsa: [
      "Automaticamente em ciclos periódicos enquanto a aplicação está no ar.",
      "Consulta equipamentos Henry ativos com IP cadastrado.",
    ],
    detalheOperacional:
      "Busca novos NSRs nos equipamentos e envia as marcações para processamento.",
  },
  {
    id: "henry-online",
    nome: "Equipamentos biometricos - online Henry",
    tipo: "continuo",
    envFlag: "HENRY_ONLINE_AUTO_WORKER",
    containerName: "secp-worker-henry-online",
    descricao: "Mantém o listener TCP para eventos online dos relógios Henry.",
    ondeUsa: ["Porta TCP dos relógios Henry", "Equipamentos biométricos"],
    quandoUsa: [
      "Ao subir a aplicação, abre o listener de eventos online.",
      "Quando relógios Henry enviam eventos para o endereço configurado.",
    ],
    detalheOperacional:
      "Escuta eventos online e tenta configurar automaticamente os equipamentos para envio ao SECP.",
  },
  {
    id: "calendario-institucional",
    nome: "Calendário institucional",
    tipo: "fila",
    fila: calendarioInstitucionalQueue as Queue,
    globalKey: "__secpCalendarioInstitucionalWorker",
    envFlag: "CALENDARIO_INSTITUCIONAL_AUTO_WORKER",
    containerName: "secp-worker-calendario",
    descricao: "Recalcula reflexos de feriados, suspensões e pontos facultativos.",
    ondeUsa: ["/administracao/calendario"],
    quandoUsa: [
      "Ao criar, alterar ou excluir calendário institucional com impacto em datas.",
      "Recalcula apuração e banco de horas dos servidores impactados.",
    ],
    detalheOperacional:
      "Recebe datas de referência e escopo do calendário para recalcular os reflexos.",
  },
  {
    id: "regulamentacao-ponto",
    nome: "Regulamentação do ponto",
    tipo: "fila",
    fila: recalcularRegulamentacaoPontoQueue as Queue,
    globalKey: "__secpRecalcularRegulamentacaoPontoWorker",
    envFlag: "REGULAMENTACAO_PONTO_AUTO_WORKER",
    containerName: "secp-worker-calendario",
    descricao: "Recalcula uma competência após alteração das regras do órgão.",
    ondeUsa: ["/administracao/regulamentacao-ponto/[orgaoId]"],
    quandoUsa: [
      "Ao salvar regras do órgão com a opção Recalcular esta competência ao salvar.",
      "Ignora servidores cuja competência já esteja homologada.",
    ],
    detalheOperacional:
      "Percorre servidores ativos do órgão e recalcula a competência selecionada em segundo plano.",
  },
  {
    id: "sarh-login",
    nome: "SARH login",
    tipo: "fila",
    fila: obterSarhLoginSyncQueue() as Queue,
    globalKey: "__secpSarhLoginSyncWorker",
    envFlag: "SARH_LOGIN_SYNC_AUTO_WORKER",
    containerName: "secp-worker-sarh-login",
    descricao: "Atualiza dados funcionais do servidor após login.",
    ondeUsa: ["Fluxo de autenticação", "auth.ts"],
    quandoUsa: [
      "Quando o usuário faz login e há matrícula associada.",
      "Executa uma sincronização incremental com pequena espera configurável.",
    ],
    detalheOperacional:
      "Atualiza lotações, cargos, servidores, afastamentos, chefias e calendários relacionados à matrícula.",
  },
  {
    id: "sarh-sync",
    nome: "SARH sincronização",
    tipo: "fila",
    fila: obterSarhSyncQueue() as Queue,
    globalKey: "__secpSarhSyncWorker",
    envFlag: "SARH_SYNC_AUTO_WORKER",
    containerName: "secp-worker-sarh",
    descricao: "Executa sincronizações manuais ou amplas com o SARH.",
    ondeUsa: ["/administracao/integracoes/sarh", "API /api/integracoes/sarh/sincronizar"],
    quandoUsa: [
      "Ao clicar no botão de sincronização do SARH.",
      "Pode rodar por escopo global, órgão, unidade, matrícula ou endpoints selecionados.",
    ],
    detalheOperacional:
      "Sincroniza servidores, lotações, cargos, afastamentos, chefias, calendários e demais endpoints habilitados.",
  },
  {
    id: "coleta-relogio",
    nome: "Equipamentos biometricos - coleta automatica",
    tipo: "fila",
    fila: coletaRelogioProgressivaQueue as Queue,
    containerName: "secp-worker-coleta-relogio",
    descricao: "Coleta marcacoes de equipamentos biometricos por fila progressiva.",
    ondeUsa: ["Equipamentos biometricos", "Control iD FACE ID", "coleta progressiva"],
    quandoUsa: [
      "Automaticamente em ciclos periodicos no container de coleta.",
      "Ao iniciar coleta progressiva manual na tela de equipamentos.",
    ],
    detalheOperacional:
      "Enfileira coletas por equipamento, respeita concorrencia baixa e atualiza cursor de NSR.",
  },
  {
    id: "relatorio-exportacao",
    nome: "Relatorios e exportacoes",
    tipo: "fila",
    fila: relatorioExportacaoQueue as Queue,
    containerName: "secp-worker-relatorio-exportacao",
    descricao: "Gera relatorios PDF/CSV pesados fora do processo web.",
    ondeUsa: ["Relatorios", "Exportacoes assincronas"],
    quandoUsa: [
      "Quando o usuario solicita relatorios grandes.",
      "Evita bloqueio da navegacao durante geracao de arquivos.",
    ],
    detalheOperacional:
      "Processa jobs de exportacao e grava os arquivos gerados no volume compartilhado.",
  },
];

function workerAtivoNoProcesso(worker: WorkerMetadata) {
  if (!worker.globalKey) {
    return false;
  }

  const handle = (globalThis as Record<string, unknown>)[worker.globalKey] as
    | { closing?: Promise<void> }
    | undefined;

  return Boolean(handle && !handle.closing);
}

function flagDesabilitada(worker: WorkerMetadata) {
  return worker.envFlag ? process.env[worker.envFlag] === "false" : false;
}

function statusLabel(status: WorkerHealthStatus) {
  if (status === "online") return "Online";
  if (status === "parado") return "Parado";
  return "Atenção";
}

function statusPorContainer(
  container: DockerContainerHealth | undefined,
): WorkerHealthStatus | null {
  if (!container) return null;
  if (!container.disponivel) return "atencao";
  if (!container.running) return "parado";
  if (container.health === "unhealthy") return "atencao";
  return "online";
}

function motivoPorContainer(container: DockerContainerHealth | undefined) {
  if (!container) return null;
  if (!container.disponivel) {
    return container.erro
      ? `Nao foi possivel consultar o Docker: ${container.erro}`
      : "Nao foi possivel consultar o Docker.";
  }
  if (!container.running) {
    return `Container ${container.containerName} nao esta em execucao.`;
  }
  if (container.health === "unhealthy") {
    return `Container ${container.containerName} esta unhealthy.`;
  }
  return null;
}

function dataJob(job: Job) {
  const timestamp = job.finishedOn ?? job.processedOn ?? job.timestamp;
  return timestamp ? new Date(timestamp) : null;
}

function serializarJob(job: Job): WorkerHealthLog {
  const estado =
    job.failedReason || job.finishedOn
      ? job.failedReason
        ? "failed"
        : "completed"
      : job.processedOn
        ? "active"
        : "waiting";

  return {
    id: String(job.id),
    data: dataJob(job),
    estado,
    nome: job.name,
    mensagem:
      job.failedReason ??
      (job.finishedOn ? "Job concluído." : "Job aguardando ou em execução."),
    progresso: job.progress,
    dados: job.data,
  };
}

async function obterResumoFila(
  worker: WorkerMetadata,
): Promise<WorkerResumoInterno> {
  const fila = worker.fila;

  if (!fila) {
    return {
      status: "parado" as WorkerHealthStatus,
      motivoAtencao: "Worker sem fila configurada.",
      counts: undefined,
      ultimaAtividadeEm: null,
    };
  }

  const counts = (await fila.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused",
  )) as QueueCounts;
  const recentes = await fila.getJobs(
    ["active", "waiting", "delayed", "completed", "failed"],
    0,
    9,
    false,
  );
  const falhaRecente = recentes.find((job) => job.failedReason);
  const ultimaAtividadeEm = recentes[0] ? dataJob(recentes[0]) : null;
  const ativoNoProcesso = workerAtivoNoProcesso(worker);

  if (!ativoNoProcesso) {
    return {
      status: "parado" as WorkerHealthStatus,
      motivoAtencao: flagDesabilitada(worker)
        ? "Worker desabilitado por variável de ambiente."
        : "Worker não está ativo neste processo.",
      counts,
      ultimaAtividadeEm,
    };
  }

  if (falhaRecente) {
    return {
      status: "atencao" as WorkerHealthStatus,
      motivoAtencao: `Último erro em job ${falhaRecente.id}: ${falhaRecente.failedReason}`,
      counts,
      ultimaAtividadeEm,
    };
  }

  return {
    status: "online" as WorkerHealthStatus,
    motivoAtencao: null,
    counts,
    ultimaAtividadeEm,
  };
}

function obterResumoContinuo(worker: WorkerMetadata): WorkerResumoInterno {
  if (worker.id === "henry-online") {
    const status = obterStatusHenryOnlineWorker();

    return {
      status: status.ativo ? "online" : "parado",
      motivoAtencao: status.ativo
        ? null
        : flagDesabilitada(worker)
          ? "Worker desabilitado por variável de ambiente."
          : "Listener TCP não está ativo neste processo.",
      ultimaAtividadeEm: status.iniciadoEm,
      logs: [
        {
          id: "status",
          data: status.iniciadoEm,
          estado: status.ativo ? "online" : "parado",
          mensagem: status.ativo
            ? `Listener ativo em ${status.host}:${status.porta}.`
            : `Listener configurado para ${status.host}:${status.porta}, mas não iniciado.`,
        },
      ],
    };
  }

  const status = obterStatusHenryColetaWorker();
  const exigeAtencao =
    status.ativo &&
    status.ultimoErroEm &&
    Date.now() - status.ultimoErroEm.getTime() < 60 * 60 * 1000;

  return {
    status: status.ativo ? (exigeAtencao ? "atencao" : "online") : "parado",
    motivoAtencao: status.ativo
      ? exigeAtencao
        ? "Houve erro de coleta na última hora."
        : null
      : flagDesabilitada(worker)
        ? "Worker desabilitado por variável de ambiente."
        : "Coleta periódica não está ativa neste processo.",
    ultimaAtividadeEm: status.ultimoCicloEm ?? status.iniciadoEm,
    logs:
      status.eventosRecentes.length > 0
        ? status.eventosRecentes.map((evento, index) => ({
            id: String(index),
            data: new Date(evento.data),
            estado: evento.nivel,
            mensagem: evento.mensagem,
          }))
        : [
            {
              id: "status",
              data: status.iniciadoEm,
              estado: status.ativo ? "online" : "parado",
              mensagem: status.ativo
                ? `Coleta ativa. Intervalo=${status.intervaloMs}ms, quantidade=${status.quantidade}.`
                : "Coleta periódica não iniciada.",
            },
          ],
  };
}

export function listarWorkersCatalogo() {
  return WORKERS;
}

export async function listarSaudeWorkers(): Promise<WorkerHealthResumo[]> {
  const itens = await Promise.all(
    WORKERS.map(async (worker) => {
      const container = worker.containerName
        ? await obterSaudeContainerDocker(worker.containerName)
        : undefined;
      const base = {
        id: worker.id,
        nome: worker.nome,
        tipo: worker.tipo,
        descricao: worker.descricao,
        ondeUsa: worker.ondeUsa,
        quandoUsa: worker.quandoUsa,
        detalheOperacional: worker.detalheOperacional,
        queueName: worker.fila?.name,
        container,
        ativoNoProcesso:
          container?.running ||
          (worker.tipo === "fila"
            ? workerAtivoNoProcesso(worker)
            : worker.id === "henry-online"
              ? obterStatusHenryOnlineWorker().ativo
              : obterStatusHenryColetaWorker().ativo),
      };

      try {
        const status =
          worker.tipo === "fila"
            ? await obterResumoFila(worker)
            : obterResumoContinuo(worker);
        const statusContainer = statusPorContainer(container);
        const statusFinal = statusContainer ?? status.status;
        const motivoContainer = motivoPorContainer(container);

        return {
          ...base,
          status: statusFinal,
          statusLabel: statusLabel(statusFinal),
          counts: "counts" in status ? status.counts : undefined,
          ultimaAtividadeEm: status.ultimaAtividadeEm,
          motivoAtencao: motivoContainer ?? status.motivoAtencao,
        };
      } catch (error) {
        return {
          ...base,
          status: "atencao" as WorkerHealthStatus,
          statusLabel: "Atenção",
          motivoAtencao:
            error instanceof Error
              ? error.message
              : "Não foi possível consultar o worker.",
          ultimaAtividadeEm: null,
        };
      }
    }),
  );

  return itens;
}

export async function obterSaudeWorkerDetalhe(
  workerId: string,
): Promise<WorkerHealthDetalhe | null> {
  const worker = WORKERS.find((item) => item.id === workerId);

  if (!worker) {
    return null;
  }

  const resumo = (await listarSaudeWorkers()).find(
    (item) => item.id === workerId,
  );

  if (!resumo) {
    return null;
  }

  if (worker.tipo === "continuo") {
    return {
      ...resumo,
      logs: obterResumoContinuo(worker).logs ?? [],
    };
  }

  if (!worker.fila) {
    return {
      ...resumo,
      logs: [],
    };
  }

  const jobs = await worker.fila.getJobs(
    ["active", "waiting", "delayed", "completed", "failed"],
    0,
    19,
    false,
  );

  return {
    ...resumo,
    logs: jobs.map(serializarJob),
  };
}
