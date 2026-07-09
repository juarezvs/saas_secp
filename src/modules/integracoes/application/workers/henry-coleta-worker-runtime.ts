import { coletarMarcacoesRelogioPontoService } from "@/modules/integracoes/application/services/relogios-ponto/relogio-ponto-operacoes.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

type HenryColetaWorkerHandle = {
  fechar: () => Promise<void>;
  iniciadoEm: Date;
  obterStatus: () => HenryColetaWorkerStatus;
};

type HenryColetaWorkerGlobal = typeof globalThis & {
  __secpHenryColetaWorker?: HenryColetaWorkerHandle;
};

type HenryColetaWorkerEvento = {
  data: string;
  nivel: "info" | "erro";
  mensagem: string;
};

export type HenryColetaWorkerStatus = {
  ativo: boolean;
  iniciadoEm: Date | null;
  intervaloMs: number;
  quantidade: number;
  emExecucao: boolean;
  encerrando: boolean;
  ultimoCicloEm: Date | null;
  ultimoErroEm: Date | null;
  eventosRecentes: HenryColetaWorkerEvento[];
};

const intervaloMs = Number(process.env.HENRY_COLETA_INTERVALO_MS ?? 15000);
const quantidade = Number(process.env.HENRY_COLETA_QUANTIDADE ?? 100);

function textoErro(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function listarEquipamentosHenry() {
  return prisma.equipamentoBiometrico.findMany({
    where: {
      ativo: true,
      ip: { not: null },
      fabricante: {
        equals: "HENRY",
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      ip: true,
    },
    orderBy: {
      codigo: "asc",
    },
  });
}

export function iniciarHenryColetaWorker(): HenryColetaWorkerHandle {
  let emExecucao = false;
  let encerrando = false;
  let ultimoCicloEm: Date | null = null;
  let ultimoErroEm: Date | null = null;
  const iniciadoEm = new Date();
  const eventosRecentes: HenryColetaWorkerEvento[] = [];

  function registrarEvento(nivel: HenryColetaWorkerEvento["nivel"], mensagem: string) {
    eventosRecentes.unshift({
      data: new Date().toISOString(),
      nivel,
      mensagem,
    });
    eventosRecentes.splice(20);
  }

  async function executarCicloColeta() {
    if (emExecucao || encerrando) {
      return;
    }

    emExecucao = true;

    try {
      const equipamentos = await listarEquipamentosHenry();

      for (const equipamento of equipamentos) {
        if (encerrando) break;

        try {
          const resultado = await coletarMarcacoesRelogioPontoService({
            equipamentoId: equipamento.id,
            quantidade,
          });

          console.log(
            [
              "[HENRY COLETA]",
              equipamento.codigo,
              equipamento.ip,
              `${resultado.marcacoes.length} recebida(s)`,
              `${resultado.criadas} nova(s)`,
              `${resultado.processadas} processada(s)`,
              `proximo NSR ${resultado.proximoNsr ?? "-"}`,
            ].join(" | "),
          );
          registrarEvento(
            "info",
            `${equipamento.codigo} ${equipamento.ip}: ${resultado.marcacoes.length} recebida(s), ${resultado.criadas} nova(s), ${resultado.processadas} processada(s), proximo NSR ${resultado.proximoNsr ?? "-"}.`,
          );
        } catch (error) {
          ultimoErroEm = new Date();
          console.error(
            `[HENRY COLETA] ${equipamento.codigo} ${equipamento.ip}: ${textoErro(error)}`,
          );
          registrarEvento(
            "erro",
            `${equipamento.codigo} ${equipamento.ip}: ${textoErro(error)}`,
          );
        }
      }
    } catch (error) {
      ultimoErroEm = new Date();
      console.error(`[HENRY COLETA] Falha no ciclo: ${textoErro(error)}`);
      registrarEvento("erro", `Falha no ciclo: ${textoErro(error)}`);
    } finally {
      ultimoCicloEm = new Date();
      emExecucao = false;
    }
  }

  console.log(
    `[HENRY COLETA] Worker iniciado. Intervalo=${intervaloMs}ms, quantidade=${quantidade}.`,
  );

  void executarCicloColeta();

  const timer = setInterval(() => {
    void executarCicloColeta();
  }, intervaloMs);

  return {
    iniciadoEm,
    obterStatus: () => ({
      ativo: !encerrando,
      iniciadoEm,
      intervaloMs,
      quantidade,
      emExecucao,
      encerrando,
      ultimoCicloEm,
      ultimoErroEm,
      eventosRecentes: [...eventosRecentes],
    }),
    fechar: async () => {
      encerrando = true;
      clearInterval(timer);

      while (emExecucao) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    },
  };
}

export function obterStatusHenryColetaWorker(): HenryColetaWorkerStatus {
  const globalWorker = globalThis as HenryColetaWorkerGlobal;
  const worker = globalWorker.__secpHenryColetaWorker;

  return worker?.obterStatus() ?? {
    ativo: false,
    iniciadoEm: null,
    intervaloMs,
    quantidade,
    emExecucao: false,
    encerrando: false,
    ultimoCicloEm: null,
    ultimoErroEm: null,
    eventosRecentes: [],
  };
}

export function garantirHenryColetaWorkerAutomatico() {
  if (process.env.HENRY_COLETA_AUTO_WORKER === "false") {
    return null;
  }

  const globalWorker = globalThis as HenryColetaWorkerGlobal;

  if (globalWorker.__secpHenryColetaWorker) {
    return globalWorker.__secpHenryColetaWorker;
  }

  globalWorker.__secpHenryColetaWorker = iniciarHenryColetaWorker();

  return globalWorker.__secpHenryColetaWorker;
}
