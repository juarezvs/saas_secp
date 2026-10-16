import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { enfileirarMonitorControlId } from "../../queues/control-id-monitor-queue";
import { coletarMarcacoesRelogioPontoService } from "./relogio-ponto-operacoes.service";

const inteiro = z.union([z.number(), z.string().regex(/^\d+$/)])
  .transform(Number).pipe(z.number().int().safe().nonnegative());
const logSchema = z.object({
  id: inteiro.refine((v) => v > 0),
  time: inteiro.refine((v) => v > 0 && v < 253402300800),
  event: inteiro,
  user_id: inteiro,
  identifier_id: inteiro.optional(), portal_id: inteiro.optional(),
});
const daoSchema = z.object({ object_changes: z.array(z.object({
  object: z.string(), type: z.string(), values: z.unknown().optional(),
})).max(1000) });

export function extrairLogsMonitorControlId(payload: unknown) {
  const dao = daoSchema.parse(payload);
  return dao.object_changes.filter((c) => c.object === "access_logs" && c.type === "inserted")
    .map((c) => logSchema.parse(c.values));
}

export function tokenMonitorControlIdValido(recebido: string, configurado: unknown) {
  if (typeof configurado !== "string" || configurado.length < 32 || recebido.length > 128) return false;
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(recebido), digest(configurado));
}

export async function receberMonitorControlId(request: Request, params: { equipamentoId: string; token: string; evento: string }) {
  if (!z.uuid().safeParse(params.equipamentoId).success) return Response.json({ sucesso: false }, { status: 401 });
  const equipamento = await prisma.equipamentoBiometrico.findUnique({ where: { id: params.equipamentoId } });
  const config = (equipamento?.configuracao ?? {}) as Record<string, unknown>;
  if (!equipamento?.ativo || equipamento.fabricante?.toUpperCase() !== "CONTROL_ID" ||
      !tokenMonitorControlIdValido(params.token, config.controlIdMonitorToken)) {
    return Response.json({ sucesso: false }, { status: 401 });
  }
  // Somente access_logs inseridos representam marcacoes; sensores e fotos nao.
  let logs: ReturnType<typeof extrairLogsMonitorControlId> = [];
  if (params.evento === "dao") {
    if (Number(request.headers.get("content-length") ?? 0) > 262144) return Response.json({}, { status: 413 });
    try {
      const texto = await request.text();
      if (Buffer.byteLength(texto) > 262144) return Response.json({}, { status: 413 });
      logs = extrairLogsMonitorControlId(JSON.parse(texto));
    } catch {
      return Response.json({ sucesso: false, mensagem: "Notificacao Monitor invalida." }, { status: 400 });
    }
  }
  try {
    for (const log of logs) {
      const incluirNegados = config.incluirEventosNegados === true || config.incluirEventosNegados === "true";
      if (!incluirNegados && log.event !== Number(config.eventoAcessoConcedido ?? 7)) continue;
      const codigoEventoExterno = `CONTROL_ID_MONITOR:${log.id}:${log.time}`;
      const evento = await prisma.eventoEquipamentoBiometrico.upsert({
        where: { equipamentoId_codigoEventoExterno: { equipamentoId: equipamento.id, codigoEventoExterno } },
        create: {
          equipamentoId: equipamento.id, tipoEvento: "MARCACAO", codigoEventoExterno,
          dataHora: new Date(log.time * 1000), payload: { fonte: "CONTROL_ID_MONITOR", log },
        }, update: {},
      });
      if (!evento.processado) await enfileirarMonitorControlId({
        equipamentoId: equipamento.id, eventoMonitorId: evento.id,
      });
    }
    const recebidoEm = new Date();
    await prisma.$executeRaw`UPDATE equipamentos_biometricos SET ultimo_heartbeat_em = ${recebidoEm}, configuracao = jsonb_set(COALESCE(configuracao, '{}'::jsonb), '{controlIdMonitorUltimoRecebidoEm}', ${JSON.stringify(recebidoEm.toISOString())}::jsonb) WHERE id = ${equipamento.id}::uuid`;
    return Response.json({ sucesso: true });
  } catch {
    // A notificacao fica persistida. Resposta de erro permite reenvio nativo.
    return Response.json({ sucesso: false, mensagem: "Recepcao temporariamente indisponivel." }, { status: 503 });
  }
}

export async function processarEventoMonitorControlId(params: { equipamentoId: string; eventoMonitorId?: string }) {
  if (!params.eventoMonitorId) throw new Error("Evento Monitor nao informado.");
  const evento = await prisma.eventoEquipamentoBiometrico.findUniqueOrThrow({ where: { id: params.eventoMonitorId } });
  if (evento.equipamentoId !== params.equipamentoId) throw new Error("Evento Monitor pertence a outro equipamento.");
  if (evento.processado) return { duplicado: true };
  const payload = evento.payload as { fonte?: string; log?: unknown } | null;
  if (payload?.fonte !== "CONTROL_ID_MONITOR") throw new Error("Origem Monitor invalida.");
  const log = logSchema.parse(payload.log);
  const resultado = await coletarMarcacoesRelogioPontoService({
    equipamentoId: evento.equipamentoId, nsrInicial: log.id,
    notificacaoControlIdMonitor: [log], atualizarCursor: false,
  });
  const ignorado = resultado.marcacoes.length === 0;
  const bruta = ignorado ? null : await prisma.marcacaoBruta.findFirst({
    where: { equipamentoId: evento.equipamentoId, nsr: String(log.id), dataHora: new Date(log.time * 1000) },
    select: { marcacaoId: true },
  });
  await prisma.eventoEquipamentoBiometrico.update({ where: { id: evento.id }, data: {
    processado: ignorado || resultado.processadas > 0,
    processadoEm: new Date(), marcacaoId: bruta?.marcacaoId ?? null,
    erro: ignorado ? "Evento ignorado pelo filtro de acesso do equipamento." : resultado.processadas ? null : "Marcacao bruta preservada; vinculo do servidor pendente.",
  } });
  return { criadas: resultado.criadas, processadas: resultado.processadas, ignorado };
}
