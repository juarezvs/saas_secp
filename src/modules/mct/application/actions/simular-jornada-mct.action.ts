"use server";

import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { resolverPrevisaoJornadaDia } from "@/modules/jornadas/application/services/resolver-previsao-jornada-dia.service";
import { executarMctShadow } from "../services/executar-mct-shadow.service";

export async function simularJornadaMct(input: {
  jornadaId: string;
  escalaId?: string;
  data: string;
  marcacoes: string;
}) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "mct-simulador:usar:seccional",
    "mct-simulador:usar:global",
  ]);
  const dataReferencia = new Date(`${input.data}T00:00:00.000Z`);
  if (!input.jornadaId || !Number.isFinite(dataReferencia.getTime())) {
    throw new Error("Informe jornada e data válidas.");
  }
  const jornada = await prisma.jornada.findUnique({
    where: { id: input.jornadaId },
    include: {
      dias: { include: { faixas: true } },
      escalas: { where: input.escalaId ? { id: input.escalaId } : { ativo: true }, include: { dias: true }, take: 1 },
    },
  });
  if (!jornada?.orgaoId) throw new Error("Jornada ou órgão não encontrado.");
  const politica = await prisma.mctPoliticaVersao.findFirst({
    where: {
      orgaoId: jornada.orgaoId,
      estado: "PUBLICADA",
      vigenciaInicio: { lte: dataReferencia },
      OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: dataReferencia } }],
    },
    orderBy: { versao: "desc" },
  });
  if (!politica) throw new Error("Não há política publicada para a simulação.");
  const previsao = resolverPrevisaoJornadaDia({
    jornada,
    escala: jornada.escalas[0] ?? null,
    dataReferencia,
  });
  const horarios = input.marcacoes.split(/[;,\s]+/).map((item) => item.trim()).filter(Boolean);
  if (horarios.length === 0) throw new Error("Informe ao menos uma marcação.");
  const eventos = horarios.map((hora, indice) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new Error(`Marcação inválida: ${hora}.`);
    const [h, m] = hora.split(":").map(Number);
    return {
      id: `simulacao-${indice}`,
      ocorridoEm: new Date(Date.UTC(dataReferencia.getUTCFullYear(), dataReferencia.getUTCMonth(), dataReferencia.getUTCDate(), h, m)),
      tipo: (indice % 2 === 0 ? "ENTRADA" : "SAIDA") as "ENTRADA" | "SAIDA",
      fonte: "SIMULADOR",
    };
  });
  const configuracao = politica.configuracao as Record<string, unknown>;
  const resultado = await executarMctShadow({
    orgaoId: jornada.orgaoId,
    servidorId: "00000000-0000-0000-0000-000000000000",
    dataReferencia,
    politica: {
      id: politica.id,
      versao: politica.versao,
      orgaoId: politica.orgaoId,
      vigenciaInicio: politica.vigenciaInicio,
      vigenciaFim: politica.vigenciaFim,
      cargaExigivelMinutos: previsao.cargaPrevistaMinutos,
      intervaloMinimoMinutos: jornada.exigeIntervalo ? jornada.intervaloMinimoMinutos : null,
      intervaloMaximoMinutos: jornada.exigeIntervalo ? jornada.intervaloMaximoMinutos : null,
      flexibilidadeEntradaMinutos: Number(configuracao.flexibilidadeEntradaMinutos ?? 0),
      flexibilidadeSaidaMinutos: Number(configuracao.flexibilidadeSaidaMinutos ?? 0),
      permiteCompensacaoNoDia: jornada.permiteCompensacaoNoDia,
    },
    plano: {
      dataReferencia,
      trabalha: previsao.trabalha,
      jornadaPrevistaMinutos: previsao.cargaPrevistaMinutos,
      jornadaExigivelMinutos: previsao.cargaPrevistaMinutos,
      minutosReconhecidosComoExercicio: 0,
      posicaoCiclo: previsao.escalaPosicaoCiclo,
      codigoDiaCiclo: previsao.escalaPosicaoCiclo ? String(previsao.escalaPosicaoCiclo) : null,
      ocorrenciasAplicadas: [],
    },
    eventos,
  });
  return JSON.parse(JSON.stringify(resultado.resultado));
}
