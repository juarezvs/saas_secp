import { resolverPrevisaoJornadaDia } from "@/modules/jornadas/application/services/resolver-previsao-jornada-dia.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import type { EventoTemporal } from "../../domain/mct.types";
import { carregarClassificacaoMct } from "./carregar-classificacao-mct.service";
import { executarMctShadow, MCT_VERSAO_MOTOR } from "./executar-mct-shadow.service";

function instante(data: Date, horario: string) {
  const [hora, minuto] = horario.split(":").map(Number);
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate(), hora, minuto));
}

function somarMinutos(data: Date, minutos: number) { return new Date(data.getTime() + minutos * 60_000); }

export async function validarConfiguracaoApuracaoMct(id: string) {
  const item = await prisma.mctConfiguracaoApuracao.findUnique({
    where: { id },
    include: { politica: true, jornada: { include: { dias: { include: { faixas: true } }, escalas: { include: { dias: true } } } }, escala: { include: { dias: true } } },
  });
  if (!item?.politica || item.politica.estado !== "PUBLICADA") throw new Error("A validação exige uma política publicada.");
  const data = item.vigenciaInicio;
  const escala = item.escala ?? item.jornada.escalas.find((valor) => valor.ativo) ?? null;
  const previsao = resolverPrevisaoJornadaDia({ jornada: item.jornada, escala, dataReferencia: data });
  const inicioTexto = previsao.janela?.inicio ?? item.jornada.horarioEntradaPadrao ?? "08:00";
  const inicio = instante(data, inicioTexto);
  const fim = previsao.janela?.fim ? instante(data, previsao.janela.fim) : somarMinutos(inicio, Math.max(previsao.cargaPrevistaMinutos, 1));
  const eventos: EventoTemporal[] = [
    { id: "validacao-entrada", ocorridoEm: inicio, tipo: "ENTRADA", fonte: "VALIDACAO_CONFIGURACAO" },
    { id: "validacao-saida", ocorridoEm: fim <= inicio ? somarMinutos(fim, 24 * 60) : fim, tipo: "SAIDA", fonte: "VALIDACAO_CONFIGURACAO" },
  ];
  const classificacao = await carregarClassificacaoMct({ orgaoId: item.orgaoId, politicaVersaoId: item.politica.id, dataReferencia: data });
  const parametros = item.politica.configuracao as Record<string, unknown>;
  const retorno = await executarMctShadow({
    orgaoId: item.orgaoId,
    servidorId: "00000000-0000-0000-0000-000000000000",
    dataReferencia: data,
    politica: { id: item.politica.id, versao: item.politica.versao, orgaoId: item.orgaoId, vigenciaInicio: item.politica.vigenciaInicio, vigenciaFim: item.politica.vigenciaFim, cargaExigivelMinutos: previsao.cargaPrevistaMinutos, intervaloMinimoMinutos: item.jornada.intervaloMinimoMinutos, intervaloMaximoMinutos: item.jornada.intervaloMaximoMinutos, flexibilidadeEntradaMinutos: Number(parametros.flexibilidadeEntradaMinutos ?? 0), flexibilidadeSaidaMinutos: Number(parametros.flexibilidadeSaidaMinutos ?? 0), permiteCompensacaoNoDia: item.jornada.permiteCompensacaoNoDia },
    plano: { dataReferencia: data, trabalha: previsao.trabalha, jornadaPrevistaMinutos: previsao.cargaPrevistaMinutos, jornadaExigivelMinutos: previsao.cargaPrevistaMinutos, minutosReconhecidosComoExercicio: 0, posicaoCiclo: previsao.escalaPosicaoCiclo, codigoDiaCiclo: previsao.escalaPosicaoCiclo ? String(previsao.escalaPosicaoCiclo) : null, ocorrenciasAplicadas: [] },
    eventos,
    classificacao,
  });
  return {
    sucesso: true,
    validadaEm: new Date().toISOString(),
    versaoMotor: MCT_VERSAO_MOTOR,
    politicaVersaoId: item.politica.id,
    jornadaId: item.jornadaId,
    hashEntrada: retorno.resultado.hashEntrada,
    possuiPendencias: retorno.resultado.possuiPendencias,
    regrasExecutadas: retorno.resultado.classificacao?.regrasExecutadas.length ?? 0,
    rubricasAplicadas: retorno.resultado.classificacao?.aplicacoes.length ?? 0,
  };
}
