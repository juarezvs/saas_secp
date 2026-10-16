import { prisma } from "../src/shared/infrastructure/database/prisma";
import { dataHoraAccessLogControlId } from "../src/modules/integracoes/application/services/relogios-ponto/control-id-access-log-time";
import { executarComLockDistribuidoEquipamento } from "../src/modules/integracoes/application/services/relogios-ponto/relogio-ponto-distributed-lock";
import { gerarHashMarcacaoBruta } from "../src/modules/marcacoes-brutas/application/services/gerar-hash-marcacao-bruta.service";
import { obterDataReferencia } from "../src/modules/marcacoes/application/services/data-marcacao.service";
import { verificarEspelhoEnviadoParaHomologacao } from "../src/modules/homologacao/application/services/bloquear-espelho-enviado.service";
import { recalcularMesServidorService } from "../src/modules/recalculo/application/services/recalcular-mes-servidor.service";

const [ip, dia, offsetTexto] = process.argv.slice(2);
const offset = Number(offsetTexto);
if (!ip || !/^\d{4}-\d{2}-\d{2}$/.test(dia ?? "") || !Number.isInteger(offset) || offset === 0 || offset < -720 || offset > 840) {
  throw new Error("Uso: tsx scripts/corrigir-horario-control-id.ts IP YYYY-MM-DD OFFSET_MINUTOS [--aplicar]");
}
const aplicar = process.argv.includes("--aplicar");
const json = (value: unknown) => JSON.parse(JSON.stringify(value));
const competencias = new Map<string, { servidorId: string; anoReferencia: number; mesReferencia: number }>();
try {
  const equipamento = await prisma.equipamentoBiometrico.findFirstOrThrow({ where: { ip, ativo: true, fabricante: "CONTROL_ID" } });
  await executarComLockDistribuidoEquipamento(equipamento.id, async () => {
    const inicio = new Date(`${dia}T00:00:00Z`);
    const fim = new Date(inicio.getTime() + 86400000);
    const brutas = await prisma.marcacaoBruta.findMany({ where: { equipamentoId: equipamento.id, dataHora: { gte: inicio, lt: fim } } });
    let corrigidas = 0;
    for (const bruta of brutas) {
      const payload = json(bruta.payloadOriginal ?? {});
      const log = payload.payload?.log;
      if (!log || String(log.id) !== bruta.nsr) continue;
      const original = dataHoraAccessLogControlId(log.time);
      const corrigida = dataHoraAccessLogControlId(log.time, { accessLogsUtcOffsetMinutos: offset });
      if (!original || !corrigida || bruta.dataHora.getTime() !== original.getTime()) continue;
      // Exige evidência de recebimento próximo da hora civil corrigida.
      // Registros antigos/atrasados e horas alteradas manualmente ficam para revisão.
      if (Math.abs(bruta.criadoEm.getTime() - corrigida.getTime()) > 180000) {
        console.log(JSON.stringify({ nsr: bruta.nsr, ignorada: "Horario sem evidencia temporal suficiente" }));
        continue;
      }
      const marcacao = bruta.marcacaoId ? await prisma.marcacao.findUniqueOrThrow({ where: { id: bruta.marcacaoId } }) : null;
      if (marcacao && marcacao.dataHora.getTime() !== original.getTime()) continue;
      const referencia = marcacao ? obterDataReferencia(corrigida, marcacao.fusoHorario) : null;
      if (marcacao && referencia) {
        try {
          await verificarEspelhoEnviadoParaHomologacao({ servidorId: marcacao.servidorId, dataReferencia: marcacao.dataReferencia });
          await verificarEspelhoEnviadoParaHomologacao({ servidorId: marcacao.servidorId, dataReferencia: referencia });
        } catch {
          console.log(JSON.stringify({ nsr: bruta.nsr, ignorada: "Competencia enviada/homologada" }));
          continue;
        }
      }
      const hashRegistro = gerarHashMarcacaoBruta({ ...bruta, dataHora: corrigida });
      if (await prisma.marcacaoBruta.findFirst({ where: { hashRegistro, id: { not: bruta.id } }, select: { id: true } })) {
        throw new Error(`Evento duplicado precisa de revisao: NSR ${bruta.nsr}`);
      }
      console.log(JSON.stringify({ nsr: bruta.nsr, antes: original, depois: corrigida, statusPreservado: marcacao?.status, aplicar }));
      if (aplicar) await prisma.$transaction(async (tx) => {
        if (marcacao && referencia) {
          const atualizadas = await tx.marcacao.updateMany({ where: { id: marcacao.id, dataHora: original, atualizadoEm: marcacao.atualizadoEm }, data: { dataHora: corrigida, dataReferencia: referencia } });
          if (atualizadas.count !== 1) throw new Error("Marcacao alterada durante a correcao; tentar novamente.");
        }
        payload.dataHora = corrigida.toISOString();
        payload.correcaoHorarioControlId = { offsetMinutos: offset, original: original.toISOString(), corrigida: corrigida.toISOString(), corrigidoEm: new Date().toISOString() };
        await tx.marcacaoBruta.update({ where: { id: bruta.id }, data: { dataHora: corrigida, hashRegistro, payloadOriginal: payload } });
        await tx.eventoEquipamentoBiometrico.updateMany({ where: { equipamentoId: equipamento.id, codigoEventoExterno: `CONTROL_ID_MONITOR:${log.id}:${log.time}` }, data: { dataHora: corrigida } });
        await tx.auditoriaEvento.create({ data: { entidade: "MarcacaoBruta", entidadeId: bruta.id, acao: "CONTROL_ID_CORRECAO_HORARIO", dadosAntes: json({ dataHora: original, hashRegistro: bruta.hashRegistro, marcacaoId: bruta.marcacaoId, status: marcacao?.status }), dadosDepois: json({ dataHora: corrigida, hashRegistro, offsetMinutos: offset, status: marcacao?.status }) } });
      });
      corrigidas++;
      if (marcacao && referencia) for (const data of [marcacao.dataReferencia, referencia]) {
        const competencia = { servidorId: marcacao.servidorId, anoReferencia: data.getUTCFullYear(), mesReferencia: data.getUTCMonth() + 1 };
        competencias.set(`${competencia.servidorId}:${competencia.anoReferencia}:${competencia.mesReferencia}`, competencia);
      }
    }
    if (aplicar) {
      await prisma.$executeRaw`UPDATE equipamentos_biometricos SET configuracao = jsonb_set(COALESCE(configuracao,'{}'::jsonb),'{accessLogsUtcOffsetMinutos}',${JSON.stringify(offset)}::jsonb) WHERE id=${equipamento.id}::uuid`;
      await prisma.auditoriaEvento.create({ data: { entidade: "EquipamentoBiometrico", entidadeId: equipamento.id, acao: "CONTROL_ID_FUSO_ACCESS_LOGS_CONFIRMADO", dadosDepois: { offsetMinutos: offset, diaCorrigido: dia, registrosCorrigidos: corrigidas } } });
    }
    console.log(JSON.stringify({ ip, dia, aplicar, corrigidas }));
  });
  if (aplicar) for (const competencia of competencias.values()) {
    await recalcularMesServidorService({ ...competencia, origem: "CONTROL_ID_CORRECAO_HORARIO" });
  }
} finally { await prisma.$disconnect(); }
process.exit(0);
