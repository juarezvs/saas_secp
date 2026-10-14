import { prisma } from "@/shared/infrastructure/database/prisma";
import { gerarAnaliseJornadaShadow } from "./gerar-analise-jornada-shadow.service";

export type ResultadoProcessamentoCompetenciaShadow = {
  servidorId: string;
  matricula: string;
  competencia: string;
  diasEncontrados: number;
  diasProcessados: number;
  diasComErro: number;
  execucoesCriadas: number;
  execucoesReutilizadas: number;
  divergencias: number;
  erros: Array<{ data: string; mensagem: string }>;
  modo: "SHADOW";
  efeitoOficial: false;
};

export function intervaloCompetencia(competencia: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error("Competência inválida. Use AAAA-MM.");
  const [ano, mes] = competencia.split("-").map(Number);
  return { inicio: new Date(Date.UTC(ano, mes - 1, 1)), fim: new Date(Date.UTC(ano, mes, 1)) };
}

export async function processarCompetenciaShadow(params: { matricula: string; competencia: string; orgaoIdsPermitidos?: string[] | null }) {
  const { inicio, fim } = intervaloCompetencia(params.competencia);
  const servidor = await prisma.servidor.findFirst({
    where: { matricula: { equals: params.matricula.trim().toUpperCase(), mode: "insensitive" }, ...(params.orgaoIdsPermitidos ? { orgaoId: { in: params.orgaoIdsPermitidos } } : {}) },
    select: { id: true, orgaoId: true, matricula: true },
  });
  if (!servidor) throw new Error(`Servidor ${params.matricula} não encontrado no escopo atual.`);
  const apuracoes = await prisma.apuracaoDiaria.findMany({ where: { servidorId: servidor.id, dataReferencia: { gte: inicio, lt: fim } }, select: { dataReferencia: true }, orderBy: { dataReferencia: "asc" } });
  if (!apuracoes.length) throw new Error("A competência não possui apurações legadas para comparação.");
  const resultado: ResultadoProcessamentoCompetenciaShadow = { servidorId: servidor.id, matricula: servidor.matricula, competencia: params.competencia, diasEncontrados: apuracoes.length, diasProcessados: 0, diasComErro: 0, execucoesCriadas: 0, execucoesReutilizadas: 0, divergencias: 0, erros: [], modo: "SHADOW", efeitoOficial: false };
  for (const apuracao of apuracoes) {
    const data = apuracao.dataReferencia.toISOString().slice(0, 10);
    try {
      const retorno = await gerarAnaliseJornadaShadow({ servidorId: servidor.id, dataReferencia: apuracao.dataReferencia });
      resultado.diasProcessados += 1;
      if (retorno.persistencia?.criada) resultado.execucoesCriadas += 1; else resultado.execucoesReutilizadas += 1;
      resultado.divergencias += retorno.comparacao.totalDivergencias;
    } catch (error) {
      resultado.diasComErro += 1;
      resultado.erros.push({ data, mensagem: error instanceof Error ? error.message : String(error) });
    }
  }
  return resultado;
}
