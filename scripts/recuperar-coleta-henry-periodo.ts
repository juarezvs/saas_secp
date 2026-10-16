/** Recupera um intervalo delimitado sem avancar o cursor da coleta historica. */
import fs from "node:fs";
import { prisma } from "../src/shared/infrastructure/database/prisma";
import { criarRelogioPontoProvider } from "../src/modules/integracoes/application/services/relogios-ponto/relogio-ponto-provider.service";
import { executarComLockDistribuidoEquipamento } from "../src/modules/integracoes/application/services/relogios-ponto/relogio-ponto-distributed-lock";
import { gerarHashMarcacaoBruta } from "../src/modules/marcacoes-brutas/application/services/gerar-hash-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "../src/modules/marcacoes-brutas/application/services/processar-marcacao-bruta.service";
import { resolverServidorMarcacaoBrutaService } from "../src/modules/marcacoes-brutas/application/services/resolver-servidor-marcacao-bruta.service";
import { recalcularMesServidorService } from "../src/modules/recalculo/application/services/recalcular-mes-servidor.service";

type Plano = {
  codigo: string;
  nsrInicial: number;
  nsrFinal: number;
};

const arquivo = process.argv[2];
const desdeTexto = process.argv[3];
if (!arquivo || !desdeTexto) {
  throw new Error("Uso: tsx scripts/recuperar-coleta-henry-periodo.ts plano.json data-inicial-ISO");
}
const desde = new Date(desdeTexto);
if (Number.isNaN(desde.getTime())) throw new Error("Data inicial invalida.");
const plano: Plano[] = JSON.parse(fs.readFileSync(arquivo, "utf8"));
if (!Array.isArray(plano) || plano.some((p) =>
  !p.codigo || !Number.isSafeInteger(p.nsrInicial) || !Number.isSafeInteger(p.nsrFinal) ||
  p.nsrInicial < 1 || p.nsrFinal < p.nsrInicial || p.nsrFinal - p.nsrInicial > 100000
)) throw new Error("Plano invalido: informe codigo e intervalo limitado a 100 mil registros por equipamento.");

let falhas = 0;
const equipamentosIds: string[] = [];
try {
  // Uma consulta por vez para nao sobrecarregar os equipamentos nem o banco.
  for (const item of plano) {
    const equipamento = await prisma.equipamentoBiometrico.findUniqueOrThrow({ where: { codigo: item.codigo } });
    equipamentosIds.push(equipamento.id);
    if (!equipamento.ativo || equipamento.fabricante?.toUpperCase() !== "HENRY" ||
      (equipamento.configuracao as Record<string, unknown> | null)?.protocolo !== "HENRY_LUMEN_BALCAO") {
      throw new Error(`Equipamento ${item.codigo} nao e um Henry Lumen ativo.`);
    }
    let nsr = item.nsrInicial;
    let criadas = 0;
    try {
      while (nsr <= item.nsrFinal) {
        let resultado;
        for (let tentativa = 1; tentativa <= 30; tentativa++) {
          try {
            resultado = await executarComLockDistribuidoEquipamento(equipamento.id, async () => {
              const config = equipamento.configuracao as Record<string, unknown>;
              const provider = criarRelogioPontoProvider({
                equipamentoId: equipamento.id, codigo: equipamento.codigo,
                fabricante: "HENRY", modelo: equipamento.modelo, ip: equipamento.ip!, porta: equipamento.porta ?? 3000,
                usuario: String(config.usuarioDados ?? config.usuario ?? "") || null,
                senha: String(config.senhaDados ?? config.senha ?? "") || null,
                configuracao: config,
              });
              const lote = await provider.coletarMarcacoesDesdeNsr({ nsrInicial: nsr, quantidade: Math.min(10, item.nsrFinal - nsr + 1) });
              const marcacoes = lote.marcacoes.filter((m) => m.dataHora >= desde && Number(m.nsr) <= item.nsrFinal);
              const existentes = await prisma.marcacaoBruta.findMany({
                where: { equipamentoId: equipamento.id, nsr: { in: marcacoes.flatMap((m) => m.nsr ? [m.nsr] : []) } },
                select: { nsr: true, dataHora: true },
              });
              const eventosExistentes = new Set(existentes.map((b) => `${b.nsr}:${b.dataHora.toISOString()}`));
              const dados = marcacoes.filter((m) => !eventosExistentes.has(`${m.nsr}:${m.dataHora.toISOString()}`)).map((m) => {
                const data = {
                  cpf: m.cpf ?? null, pis: m.pis ?? null, matricula: m.matricula ?? null, dataHora: m.dataHora,
                  equipamentoCodigo: equipamento.codigo, equipamentoId: equipamento.id,
                  origem: "EQUIPAMENTO_BIOMETRICO" as const, nsr: m.nsr ?? null,
                  codigoExterno: m.codigoExterno ?? m.nsr ?? null,
                };
                return { ...data, hashRegistro: gerarHashMarcacaoBruta(data),
                  payloadOriginal: JSON.parse(JSON.stringify({ ...m, matriculaOriginal: m.matricula ?? null, matriculaNormalizada: m.matricula ?? null, fonte: "HENRY_RR" })),
                };
              });
              const novas = dados.length ? (await prisma.marcacaoBruta.createMany({ data: dados, skipDuplicates: true })).count : 0;
              await prisma.$transaction([
                prisma.equipamentoBiometrico.update({ where: { id: equipamento.id }, data: { ultimoHeartbeatEm: new Date(), ultimaSincronizacaoEm: new Date() } }),
                prisma.logIntegracao.create({ data: {
                  integracaoId: equipamento.integracaoId, tipo: "EQUIPAMENTO_BIOMETRICO", direcao: "ENTRADA", status: "SUCESSO",
                  entidade: "EquipamentoBiometrico", entidadeId: equipamento.id,
                  mensagem: `${novas} registro(s) recuperado(s); processamento e recalculo agrupados ao final. Cursor historico preservado.`,
                  payloadEntrada: { comando: "RR", nsrInicial: nsr, nsrFinal: item.nsrFinal, desde: desde.toISOString(), atualizarCursor: false },
                  payloadSaida: { recebidas: lote.marcacoes.length, criadas: novas, proximoNsr: lote.proximoNsr ?? null }, finalizadoEm: new Date(),
                } }),
              ]);
              return { ...lote, criadas: novas };
            });
            break;
          } catch (error) {
            const ocupado = error instanceof Error && error.message.includes("Equipamento ocupado");
            if (tentativa >= (ocupado ? 30 : 5)) throw error;
            console.log(JSON.stringify({ codigo: item.codigo, nsr, tentativa, etapa: ocupado ? "aguardando_lock" : "nova_tentativa", mensagem: error instanceof Error ? error.message : String(error) }));
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
        if (!resultado || !resultado.marcacoes.length) break;
        criadas += resultado.criadas;
        const proximo = Number(resultado.proximoNsr);
        if (!Number.isSafeInteger(proximo) || proximo <= nsr) throw new Error("Coleta nao avancou; interrompida para preservar o cursor.");
        nsr = proximo;
        console.log(JSON.stringify({ codigo: item.codigo, nsr, criadas, etapa: "coleta" }));
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      console.log(JSON.stringify({ codigo: item.codigo, nsr, criadas, etapa: "coleta_concluida" }));
    } catch (error) {
      falhas++;
      console.error(JSON.stringify({ codigo: item.codigo, nsr, criadas, etapa: "erro", mensagem: error instanceof Error ? error.message : String(error) }));
    }
  }
  if (process.argv.includes("--somente-coleta")) {
    console.log(JSON.stringify({ etapa: "concluido", modo: "somente-coleta", falhas }));
    await prisma.$disconnect();
    process.exit(falhas ? 1 : 0);
  }
  const brutas = await prisma.marcacaoBruta.findMany({
    where: { equipamentoId: { in: equipamentosIds }, dataHora: { gte: desde, lte: new Date() } }, orderBy: { dataHora: "asc" },
  });
  const identidades = new Map<string, string | null>();
  const competencias = new Map<string, { servidorId: string; anoReferencia: number; mesReferencia: number }>();
  let processadas = 0;
  let semVinculo = 0;
  for (const bruta of brutas) {
    try {
      let servidorId = bruta.servidorId;
      if (!bruta.processada) {
        const chave = JSON.stringify([bruta.equipamentoId, bruta.cpf, bruta.pis, bruta.matricula]);
        if (!servidorId) {
          if (!identidades.has(chave)) identidades.set(chave, (await resolverServidorMarcacaoBrutaService(bruta))?.id ?? null);
          servidorId = identidades.get(chave) ?? null;
        }
        if (!servidorId) { semVinculo++; continue; }
        if (servidorId !== bruta.servidorId) await prisma.marcacaoBruta.update({ where: { id: bruta.id }, data: { servidorId } });
        const r = await processarMarcacaoBrutaService({ marcacaoBrutaId: bruta.id, recalcularImpactos: false });
        if (!r.sucesso) continue;
        processadas++;
      }
      if (servidorId) {
        const competencia = { servidorId, anoReferencia: bruta.dataHora.getUTCFullYear(), mesReferencia: bruta.dataHora.getUTCMonth() + 1 };
        competencias.set(JSON.stringify(competencia), competencia);
      }
      if (processadas && processadas % 100 === 0) console.log(JSON.stringify({ etapa: "processamento", processadas, semVinculo }));
    } catch (error) {
      falhas++;
      console.error(JSON.stringify({ etapa: "erro_processamento", brutaId: bruta.id, mensagem: error instanceof Error ? error.message : String(error) }));
    }
  }
  let recalculadas = 0;
  for (const competencia of competencias.values()) {
    await recalcularMesServidorService({ ...competencia, origem: "RECUPERACAO_COLETA_HENRY" });
    recalculadas++;
    console.log(JSON.stringify({ etapa: "recalculo", recalculadas, total: competencias.size }));
  }
  console.log(JSON.stringify({ etapa: "concluido", analisadas: brutas.length, processadas, semVinculo, recalculadas, falhas }));
} finally {
  await prisma.$disconnect();
}
process.exit(falhas ? 1 : 0);
