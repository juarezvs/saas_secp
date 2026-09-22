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

type HenryColetaSeccionalStatus = {
  orgaoId: string | null;
  sigla: string;
  equipamentos: number;
  emExecucao: boolean;
  ultimoCicloEm: Date | null;
  ultimoErroEm: Date | null;
};

export type HenryColetaWorkerStatus = {
  ativo: boolean;
  iniciadoEm: Date | null;
  intervaloMs: number;
  quantidade: number;
  concorrencia: number;
  emExecucao: boolean;
  encerrando: boolean;
  ultimoCicloEm: Date | null;
  ultimoErroEm: Date | null;
  seccionais: HenryColetaSeccionalStatus[];
  eventosRecentes: HenryColetaWorkerEvento[];
};

type EquipamentoHenry = {
  id: string;
  codigo: string;
  nome: string;
  ip: string | null;
};

type EscopoSeccional = {
  orgaoId: string | null;
  sigla: string;
  equipamentos: EquipamentoHenry[];
};

type EquipamentoHenryComEscopo = EquipamentoHenry & {
  orgaoId: string | null;
  orgao: { sigla: string } | null;
  unidade: {
    orgaoId: string;
    orgao: { sigla: string };
  } | null;
};

type EstadoSeccional = HenryColetaSeccionalStatus & {
  listaEquipamentos: EquipamentoHenry[];
  timer: ReturnType<typeof setTimeout> | null;
  falhasConsecutivas: Map<string, number>;
  suspensoAte: Map<string, number>;
};

const intervaloMs = Math.max(
  Number(process.env.HENRY_COLETA_INTERVALO_MS ?? 15000),
  5000,
);
const quantidade = Math.max(
  Number(process.env.HENRY_COLETA_QUANTIDADE ?? 100),
  1,
);
const concorrencia = Math.max(
  Number(process.env.HENRY_COLETA_CONCURRENCY ?? 2),
  1,
);
const atualizarEscoposIntervaloMs = Math.max(
  Number(process.env.HENRY_COLETA_ESCOPO_REFRESH_MS ?? 60000),
  15000,
);
const falhasParaSuspender = Math.max(
  Number(process.env.HENRY_COLETA_FALHAS_PARA_SUSPENDER ?? 3),
  1,
);
const suspensaoMs = Math.max(
  Number(process.env.HENRY_COLETA_SUSPENSAO_MS ?? 120000),
  intervaloMs,
);

function textoErro(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function erroColetaTemporario(error: unknown) {
  const mensagem = textoErro(error);
  return [
    "Status Henry 017",
    "Status Henry 050",
    "Status Henry 102",
    "Status Henry REP Web Server 103",
    "Equipamento ocupado por outra coleta",
    "comunicacao recusada temporariamente",
  ].some((trecho) => mensagem.includes(trecho));
}

export async function executarComConcorrenciaLimitada<T>(
  itens: T[],
  limite: number,
  executar: (item: T) => Promise<void>,
) {
  let proximoIndice = 0;
  const totalExecutores = Math.min(Math.max(limite, 1), itens.length);

  await Promise.all(
    Array.from({ length: totalExecutores }, async () => {
      while (proximoIndice < itens.length) {
        const indice = proximoIndice++;
        await executar(itens[indice]);
      }
    }),
  );
}

export function agruparEquipamentosPorSeccional(
  equipamentos: EquipamentoHenryComEscopo[],
): EscopoSeccional[] {
  const escopos = new Map<string, EscopoSeccional>();

  for (const equipamento of equipamentos) {
    const orgaoId = equipamento.orgaoId ?? equipamento.unidade?.orgaoId ?? null;
    const sigla =
      equipamento.orgao?.sigla ?? equipamento.unidade?.orgao.sigla ?? "SEM_ORGAO";
    const chave = orgaoId ?? "SEM_ORGAO";
    const escopo = escopos.get(chave) ?? { orgaoId, sigla, equipamentos: [] };

    escopo.equipamentos.push({
      id: equipamento.id,
      codigo: equipamento.codigo,
      nome: equipamento.nome,
      ip: equipamento.ip,
    });
    escopos.set(chave, escopo);
  }

  return [...escopos.values()].sort((a, b) =>
    a.sigla.localeCompare(b.sigla, "pt-BR"),
  );
}

async function listarEscoposSeccionais(): Promise<EscopoSeccional[]> {
  const equipamentos = await prisma.equipamentoBiometrico.findMany({
    where: {
      ativo: true,
      ip: { not: null },
      fabricante: { equals: "HENRY", mode: "insensitive" },
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      ip: true,
      orgaoId: true,
      orgao: { select: { sigla: true } },
      unidade: {
        select: {
          orgaoId: true,
          orgao: { select: { sigla: true } },
        },
      },
    },
    orderBy: { codigo: "asc" },
  });
  return agruparEquipamentosPorSeccional(equipamentos);
}

export function iniciarHenryColetaWorker(): HenryColetaWorkerHandle {
  let encerrando = false;
  let atualizandoEscopos = false;
  let timerAtualizacao: ReturnType<typeof setTimeout> | null = null;
  const iniciadoEm = new Date();
  const eventosRecentes: HenryColetaWorkerEvento[] = [];
  const estados = new Map<string, EstadoSeccional>();

  function registrarEvento(nivel: HenryColetaWorkerEvento["nivel"], mensagem: string) {
    eventosRecentes.unshift({ data: new Date().toISOString(), nivel, mensagem });
    eventosRecentes.splice(50);
  }

  function agendarCiclo(estado: EstadoSeccional, atrasoMs: number) {
    if (encerrando) return;
    if (estado.timer) clearTimeout(estado.timer);
    estado.timer = setTimeout(() => void executarCiclo(estado), atrasoMs);
  }

  async function coletarEquipamento(
    estado: EstadoSeccional,
    equipamento: EquipamentoHenry,
  ) {
    if ((estado.suspensoAte.get(equipamento.id) ?? 0) > Date.now()) return;

    try {
      const resultado = await coletarMarcacoesRelogioPontoService({
        equipamentoId: equipamento.id,
        quantidade,
      });
      estado.falhasConsecutivas.delete(equipamento.id);
      estado.suspensoAte.delete(equipamento.id);

      const mensagem = [
        `[HENRY COLETA ${estado.sigla}]`,
        equipamento.codigo,
        equipamento.ip,
        `${resultado.marcacoes.length} recebida(s)`,
        `${resultado.criadas} nova(s)`,
        `${resultado.processadas} processada(s)`,
        `proximo NSR ${resultado.proximoNsr ?? "-"}`,
      ].join(" | ");
      console.log(mensagem);
      registrarEvento("info", mensagem);
    } catch (error) {
      estado.ultimoErroEm = new Date();
      const temporario = erroColetaTemporario(error);
      const falhas = temporario
        ? 0
        : (estado.falhasConsecutivas.get(equipamento.id) ?? 0) + 1;

      if (temporario) {
        estado.falhasConsecutivas.delete(equipamento.id);
      } else {
        estado.falhasConsecutivas.set(equipamento.id, falhas);
      }

      let detalheSuspensao = "";
      if (!temporario && falhas >= falhasParaSuspender) {
        estado.suspensoAte.set(equipamento.id, Date.now() + suspensaoMs);
        estado.falhasConsecutivas.set(equipamento.id, 0);
        detalheSuspensao = ` Suspenso por ${Math.ceil(suspensaoMs / 1000)}s.`;
      }

      const mensagem = `[HENRY COLETA ${estado.sigla}] ${equipamento.codigo} ${equipamento.ip}: ${textoErro(error)}.${detalheSuspensao}`;
      console.error(mensagem);
      registrarEvento("erro", mensagem);
    }
  }

  async function executarCiclo(estado: EstadoSeccional) {
    if (estado.emExecucao || encerrando) return;
    estado.emExecucao = true;
    const inicio = Date.now();

    try {
      await executarComConcorrenciaLimitada(
        estado.listaEquipamentos,
        concorrencia,
        (equipamento) => coletarEquipamento(estado, equipamento),
      );
    } catch (error) {
      estado.ultimoErroEm = new Date();
      const mensagem = `[HENRY COLETA ${estado.sigla}] Falha no ciclo: ${textoErro(error)}`;
      console.error(mensagem);
      registrarEvento("erro", mensagem);
    } finally {
      estado.ultimoCicloEm = new Date();
      estado.emExecucao = false;
      agendarCiclo(estado, Math.max(intervaloMs - (Date.now() - inicio), 0));
    }
  }

  async function atualizarEscopos() {
    if (atualizandoEscopos || encerrando) return;
    atualizandoEscopos = true;

    try {
      const escopos = await listarEscoposSeccionais();
      const chavesAtivas = new Set<string>();

      for (const escopo of escopos) {
        const chave = escopo.orgaoId ?? "SEM_ORGAO";
        chavesAtivas.add(chave);
        const existente = estados.get(chave);

        if (existente) {
          existente.sigla = escopo.sigla;
          existente.equipamentos = escopo.equipamentos.length;
          existente.listaEquipamentos = escopo.equipamentos;
          continue;
        }

        const estado: EstadoSeccional = {
          orgaoId: escopo.orgaoId,
          sigla: escopo.sigla,
          equipamentos: escopo.equipamentos.length,
          emExecucao: false,
          ultimoCicloEm: null,
          ultimoErroEm: null,
          listaEquipamentos: escopo.equipamentos,
          timer: null,
          falhasConsecutivas: new Map(),
          suspensoAte: new Map(),
        };
        estados.set(chave, estado);
        registrarEvento(
          "info",
          `[HENRY COLETA] Seccional ${escopo.sigla} iniciada com ${escopo.equipamentos.length} equipamento(s).`,
        );
        agendarCiclo(estado, 0);
      }

      for (const [chave, estado] of estados) {
        if (chavesAtivas.has(chave) || estado.emExecucao) continue;
        if (estado.timer) clearTimeout(estado.timer);
        estados.delete(chave);
        registrarEvento("info", `[HENRY COLETA] Seccional ${estado.sigla} removida.`);
      }
    } catch (error) {
      const mensagem = `[HENRY COLETA] Falha ao atualizar seccionais: ${textoErro(error)}`;
      console.error(mensagem);
      registrarEvento("erro", mensagem);
    } finally {
      atualizandoEscopos = false;
      if (!encerrando) {
        timerAtualizacao = setTimeout(
          () => void atualizarEscopos(),
          atualizarEscoposIntervaloMs,
        );
      }
    }
  }

  console.log(
    `[HENRY COLETA] Supervisor iniciado. Intervalo=${intervaloMs}ms, quantidade=${quantidade}, concorrencia=${concorrencia}.`,
  );
  void atualizarEscopos();

  return {
    iniciadoEm,
    obterStatus: () => {
      const seccionais = [...estados.values()]
        .map((estado) => ({
          orgaoId: estado.orgaoId,
          sigla: estado.sigla,
          equipamentos: estado.equipamentos,
          emExecucao: estado.emExecucao,
          ultimoCicloEm: estado.ultimoCicloEm,
          ultimoErroEm: estado.ultimoErroEm,
        }))
        .sort((a, b) => a.sigla.localeCompare(b.sigla, "pt-BR"));
      const datasCiclo = seccionais
        .map((item) => item.ultimoCicloEm)
        .filter((item): item is Date => Boolean(item));
      const datasErro = seccionais
        .map((item) => item.ultimoErroEm)
        .filter((item): item is Date => Boolean(item));

      return {
        ativo: !encerrando,
        iniciadoEm,
        intervaloMs,
        quantidade,
        concorrencia,
        emExecucao: seccionais.some((item) => item.emExecucao),
        encerrando,
        ultimoCicloEm:
          datasCiclo.length > 0
            ? new Date(Math.max(...datasCiclo.map((item) => item.getTime())))
            : null,
        ultimoErroEm:
          datasErro.length > 0
            ? new Date(Math.max(...datasErro.map((item) => item.getTime())))
            : null,
        seccionais,
        eventosRecentes: [...eventosRecentes],
      };
    },
    fechar: async () => {
      encerrando = true;
      if (timerAtualizacao) clearTimeout(timerAtualizacao);
      for (const estado of estados.values()) {
        if (estado.timer) clearTimeout(estado.timer);
      }
      while ([...estados.values()].some((estado) => estado.emExecucao)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    },
  };
}

export function obterStatusHenryColetaWorker(): HenryColetaWorkerStatus {
  const worker = (globalThis as HenryColetaWorkerGlobal).__secpHenryColetaWorker;
  return worker?.obterStatus() ?? {
    ativo: false,
    iniciadoEm: null,
    intervaloMs,
    quantidade,
    concorrencia,
    emExecucao: false,
    encerrando: false,
    ultimoCicloEm: null,
    ultimoErroEm: null,
    seccionais: [],
    eventosRecentes: [],
  };
}

export function garantirHenryColetaWorkerAutomatico() {
  if (process.env.HENRY_COLETA_AUTO_WORKER === "false") return null;
  const globalWorker = globalThis as HenryColetaWorkerGlobal;
  globalWorker.__secpHenryColetaWorker ??= iniciarHenryColetaWorker();
  return globalWorker.__secpHenryColetaWorker;
}
