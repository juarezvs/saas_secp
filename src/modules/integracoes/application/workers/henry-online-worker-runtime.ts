import net from "node:net";
import os from "node:os";

import { configurarEventosOnlineRelogioPontoService } from "@/modules/integracoes/application/services/relogios-ponto/relogio-ponto-operacoes.service";
import { parseLinhaAfd } from "@/modules/afd/application/services/parse-afd.service";
import { criarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/processar-marcacao-bruta.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

type HenryOnlineWorkerHandle = {
  host: string;
  porta: number;
  iniciadoEm: Date;
  fechar: () => Promise<void>;
};

type HenryOnlineWorkerGlobal = typeof globalThis & {
  __secpHenryOnlineWorker?: HenryOnlineWorkerHandle;
  __secpHenryOnlineConfiguracaoAoSubir?: boolean;
};

const START_BYTE = 0x02;
const END_BYTE = 0x03;

function getPortaOnline() {
  return Number(process.env.HENRY_ONLINE_PORT ?? 3001);
}

function getHostEscutaOnline() {
  return process.env.HENRY_ONLINE_HOST ?? "0.0.0.0";
}

function normalizarHostPublico(valor: string | undefined) {
  if (!valor?.trim()) return null;

  try {
    const url = new URL(valor);
    return url.hostname;
  } catch {
    return valor.trim().replace(/:\d+$/, "");
  }
}

function descobrirIpv4Local() {
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const item of interfaces ?? []) {
      if (item.family === "IPv4" && !item.internal) {
        return item.address;
      }
    }
  }

  return null;
}

function getHostPublicoSecp() {
  return (
    normalizarHostPublico(process.env.HENRY_ONLINE_PUBLIC_HOST) ??
    normalizarHostPublico(process.env.SECP_PUBLIC_HOST) ??
    normalizarHostPublico(process.env.NEXT_PUBLIC_APP_URL) ??
    descobrirIpv4Local()
  );
}

function textoErro(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function xorChecksum(buffer: Buffer) {
  let checksum = 0;
  for (const byte of buffer) checksum ^= byte;
  return checksum;
}

function parsePacoteHenry(buffer: Buffer) {
  if (buffer[0] !== START_BYTE || buffer[buffer.length - 1] !== END_BYTE) {
    throw new Error("Pacote Henry online invalido.");
  }

  const tamanho = buffer.readUInt16LE(1);
  const payload = buffer.subarray(3, 3 + tamanho);
  const checksumRecebido = buffer[3 + tamanho];
  const checksumCalculado = xorChecksum(buffer.subarray(1, 3 + tamanho));

  if (checksumRecebido !== checksumCalculado) {
    throw new Error("Checksum Henry online invalido.");
  }

  const texto = payload.toString("latin1");
  const [indice = "00", comando = "", status = "", ...restante] = texto.split("+");

  return {
    indice,
    comando,
    status,
    dados: restante.join("+"),
  };
}

function pacoteCompleto(buffer: Buffer) {
  if (buffer.length < 6 || buffer[0] !== START_BYTE) return false;
  const tamanho = buffer.readUInt16LE(1);
  return buffer.length >= tamanho + 5 && buffer[tamanho + 4] === END_BYTE;
}

function extrairEventoOnline(dados: string) {
  const match = dados.match(/EV\[(.+)$/);
  return match?.[1]?.trim() || null;
}

function parseDataHoraHenry(texto: string) {
  const match = texto.match(
    /(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2}):(\d{2})/,
  );

  if (!match) return null;

  const [, dia, mes, anoTexto, hora, minuto, segundo] = match;
  const ano = anoTexto.length === 2 ? 2000 + Number(anoTexto) : Number(anoTexto);
  const data = new Date(
    ano,
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto),
    Number(segundo),
  );

  return Number.isNaN(data.getTime()) ? null : data;
}

function normalizarCpf(valor: string | null) {
  const cpf = (valor ?? "").replace(/\D/g, "");
  return cpf.length === 12 && cpf.startsWith("0") ? cpf.slice(1) : cpf;
}

function parseMarcacaoOnline(evento: string) {
  const afd = parseLinhaAfd(evento);
  if (afd) {
    return {
      nsr: afd.nsr,
      cpf: afd.cpf,
      matricula: afd.matricula,
      dataHora: afd.dataHora,
      codigoExterno: afd.nsr,
    };
  }

  const dataHora = parseDataHoraHenry(evento);
  const nsr = evento.match(/^\D*(\d{1,9})/)?.[1] ?? null;
  const cpf = normalizarCpf(evento.match(/\b0?(\d{11})\b/)?.[1] ?? null);
  const matricula =
    evento.match(/\bmat(?:ricula)?[:=\[]?(\d{1,20})\b/i)?.[1] ?? null;

  if (!dataHora || (!cpf && !matricula)) {
    return null;
  }

  return {
    nsr,
    cpf: cpf || null,
    matricula,
    dataHora,
    codigoExterno: nsr,
  };
}

async function registrarEventoOnline(remoteAddress: string, evento: string) {
  const ip = remoteAddress.replace(/^::ffff:/, "");
  const equipamento = await prisma.equipamentoBiometrico.findFirst({
    where: {
      ip,
      ativo: true,
      fabricante: {
        equals: "HENRY",
        mode: "insensitive",
      },
    },
  });

  if (!equipamento) {
    console.warn("[HENRY ONLINE] Equipamento nao cadastrado para IP:", ip);
    return;
  }

  const marcacao = parseMarcacaoOnline(evento);

  await prisma.equipamentoBiometrico.update({
    where: { id: equipamento.id },
    data: { ultimoHeartbeatEm: new Date() },
  });

  if (!marcacao) {
    await prisma.eventoEquipamentoBiometrico.create({
      data: {
        equipamentoId: equipamento.id,
        tipoEvento: "HEARTBEAT",
        processado: true,
        processadoEm: new Date(),
        payload: { fonte: "HENRY_RO", evento } as never,
      },
    });
    return;
  }

  const eventoEquipamento = await prisma.eventoEquipamentoBiometrico.create({
    data: {
      equipamentoId: equipamento.id,
      tipoEvento: "MARCACAO",
      codigoEventoExterno: marcacao.codigoExterno,
      nsr: marcacao.nsr,
      matricula: marcacao.matricula,
      dataHora: marcacao.dataHora,
      payload: { fonte: "HENRY_RO", evento } as never,
    },
  });

  const bruta = await criarMarcacaoBrutaService({
    cpf: marcacao.cpf,
    matricula: marcacao.matricula,
    dataHora: marcacao.dataHora,
    equipamentoCodigo: equipamento.codigo,
    equipamentoId: equipamento.id,
    origem: "EQUIPAMENTO_BIOMETRICO",
    nsr: marcacao.nsr,
    codigoExterno: marcacao.codigoExterno,
    payloadOriginal: {
      fonte: "HENRY_RO",
      evento,
      eventoEquipamentoId: eventoEquipamento.id,
    },
  });

  const processamento = await processarMarcacaoBrutaService({
    marcacaoBrutaId: bruta.marcacaoBruta.id,
  });

  await prisma.eventoEquipamentoBiometrico.update({
    where: { id: eventoEquipamento.id },
    data: {
      processado: processamento.sucesso,
      processadoEm: processamento.sucesso ? new Date() : null,
      marcacaoId: processamento.marcacaoId ?? null,
      erro: processamento.sucesso ? null : processamento.mensagem,
    },
  });
}

async function configurarRelogiosHenryParaEventosOnline() {
  if (process.env.HENRY_ONLINE_CONFIGURAR_AO_SUBIR === "false") {
    return;
  }

  const hostPublico = getHostPublicoSecp();
  const porta = getPortaOnline();

  if (!hostPublico || hostPublico === "0.0.0.0") {
    console.warn(
      "[HENRY ONLINE] Nao foi possivel descobrir o IP publico do SECP para configurar os relogios. Defina HENRY_ONLINE_PUBLIC_HOST.",
    );
    return;
  }

  const equipamentos = await prisma.equipamentoBiometrico.findMany({
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
      ip: true,
    },
    orderBy: {
      codigo: "asc",
    },
  });

  for (const equipamento of equipamentos) {
    try {
      const resultado = await configurarEventosOnlineRelogioPontoService({
        equipamentoId: equipamento.id,
        habilitado: true,
        ipServidor: hostPublico,
        portaServidor: porta,
      });

      console.log(
        [
          "[HENRY ONLINE]",
          "Configuracao de eventos online enviada",
          equipamento.codigo,
          equipamento.ip,
          `${hostPublico}:${porta}`,
          resultado.sucesso ? "OK" : resultado.mensagem,
        ].join(" | "),
      );
    } catch (error) {
      console.error(
        `[HENRY ONLINE] Falha ao configurar eventos online em ${equipamento.codigo} ${equipamento.ip}: ${textoErro(error)}`,
      );
    }
  }
}

function agendarConfiguracaoAutomaticaEventosOnline() {
  const globalWorker = globalThis as HenryOnlineWorkerGlobal;

  if (globalWorker.__secpHenryOnlineConfiguracaoAoSubir) {
    return;
  }

  globalWorker.__secpHenryOnlineConfiguracaoAoSubir = true;

  setTimeout(() => {
    void configurarRelogiosHenryParaEventosOnline();
  }, Number(process.env.HENRY_ONLINE_CONFIGURAR_DELAY_MS ?? 5000));
}

export function iniciarHenryOnlineWorker(): HenryOnlineWorkerHandle {
  const porta = getPortaOnline();
  const host = getHostEscutaOnline();
  const server = net.createServer((socket) => {
    const origem = socket.remoteAddress ?? "desconhecido";
    console.log("[HENRY ONLINE] Conexao recebida de", origem);

    let buffer = Buffer.alloc(0);

    socket.on("data", async (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!pacoteCompleto(buffer)) return;

      const pacote = buffer;
      buffer = Buffer.alloc(0);

      try {
        const resposta = parsePacoteHenry(pacote);
        if (resposta.comando !== "RO" || resposta.status !== "00") {
          return;
        }

        const evento = extrairEventoOnline(resposta.dados);
        if (!evento) return;

        await registrarEventoOnline(origem, evento);
      } catch (error) {
        console.error("[HENRY ONLINE] Falha ao processar evento:", error);
      }
    });
  });

  server.on("error", (error) => {
    console.error("[HENRY ONLINE] Erro no servidor TCP:", error);
  });

  server.listen(porta, host, () => {
    console.log(`[HENRY ONLINE] Worker TCP escutando em ${host}:${porta}`);
    agendarConfiguracaoAutomaticaEventosOnline();
  });

  return {
    host,
    porta,
    iniciadoEm: new Date(),
    fechar: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

export function garantirHenryOnlineWorkerAutomatico() {
  if (process.env.HENRY_ONLINE_AUTO_WORKER === "false") {
    return null;
  }

  const globalWorker = globalThis as HenryOnlineWorkerGlobal;

  if (globalWorker.__secpHenryOnlineWorker) {
    agendarConfiguracaoAutomaticaEventosOnline();
    return globalWorker.__secpHenryOnlineWorker;
  }

  globalWorker.__secpHenryOnlineWorker = iniciarHenryOnlineWorker();

  return globalWorker.__secpHenryOnlineWorker;
}

export function obterStatusHenryOnlineWorker() {
  const globalWorker = globalThis as HenryOnlineWorkerGlobal;
  const worker = globalWorker.__secpHenryOnlineWorker;
  const host = worker?.host ?? getHostEscutaOnline();
  const porta = worker?.porta ?? getPortaOnline();

  return worker
    ? {
        ativo: true,
        host,
        porta,
        iniciadoEm: worker.iniciadoEm ?? null,
      }
    : {
        ativo: false,
        host,
        porta,
        iniciadoEm: null,
      };
}
