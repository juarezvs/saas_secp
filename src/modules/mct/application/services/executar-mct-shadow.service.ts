import { createHash } from "node:crypto";
import type {
  EventoTemporal,
  PoliticaJornadaMct,
  ResultadoRelogioConformidade,
  ResultadoRelogioJornada,
  SegmentoTemporal,
} from "../../domain/mct.types";
import { normalizarEventosTemporais } from "../../domain/normalizador-temporal";
import { executarRelogioConformidade } from "../../domain/relogio-conformidade";
import { executarRelogioJornada } from "../../domain/relogio-jornada";
import { segmentarIntervalos } from "../../domain/segmentador-temporal";
import type { PlanoTemporalDia } from "../../domain/planejador-temporal";
import {
  classificarRubricasMct,
  type ContextoClassificacaoMct,
  type RegraClassificacaoMct,
  type RubricaClassificacaoMct,
} from "../../domain/classificador-multidimensional";

export const MCT_VERSAO_MOTOR = "0.1.0";

export type ResultadoExecucaoMctShadow = {
  orgaoId: string;
  servidorId: string;
  dataReferencia: Date;
  competencia: string;
  modo: "SHADOW" | "MCT";
  politicaVersaoId: string;
  versaoMotor: string;
  hashEntrada: string;
  entradaSnapshot: Record<string, unknown>;
  eventos: ReturnType<typeof normalizarEventosTemporais>["eventos"];
  segmentos: SegmentoTemporal[];
  resultadoJornada: ResultadoRelogioJornada;
  resultadoConformidade: ResultadoRelogioConformidade;
  classificacao: ReturnType<typeof classificarRubricasMct> | null;
  memoriaCalculo: Record<string, unknown>;
  possuiPendencias: boolean;
};

export interface RepositorioExecucaoMct {
  salvarShadow(
    resultado: ResultadoExecucaoMctShadow,
  ): Promise<{ id: string; criada: boolean }>;
}

export async function executarMctShadow(params: {
  orgaoId: string;
  servidorId: string;
  dataReferencia: Date;
  politica: PoliticaJornadaMct;
  eventos: EventoTemporal[];
  plano?: PlanoTemporalDia;
  classificacao?: {
    catalogo: RubricaClassificacaoMct[];
    regras: RegraClassificacaoMct[];
    contexto?: ContextoClassificacaoMct;
    autorizacoes?: string[];
  };
  repositorio?: RepositorioExecucaoMct;
  modo?: "SHADOW" | "MCT";
}) {
  if (params.politica.orgaoId !== params.orgaoId) {
    throw new Error("Politica MCT nao pertence ao orgao da execucao.");
  }

  const normalizacao = normalizarEventosTemporais(params.eventos);
  const segmentos = segmentarIntervalos({
    intervalos: normalizacao.intervalosTrabalhados,
    marcos: params.politica.referencia
      ? [
          { instante: params.politica.referencia.inicio, codigo: "INICIO_REFERENCIA" },
          { instante: params.politica.referencia.fim, codigo: "FIM_REFERENCIA" },
        ]
      : [],
  });
  const politicaEfetiva = params.plano
    ? {
        ...params.politica,
        cargaExigivelMinutos: params.plano.jornadaExigivelMinutos,
      }
    : params.politica;
  const resultadoJornada = executarRelogioJornada({
    politica: politicaEfetiva,
    intervalosTrabalhados: normalizacao.intervalosTrabalhados,
    jornadaPrevistaMinutos: params.plano?.jornadaPrevistaMinutos,
    minutosReconhecidosComoExercicio:
      params.plano?.minutosReconhecidosComoExercicio,
  });
  const resultadoConformidade = executarRelogioConformidade({
    politica: politicaEfetiva,
    intervalosTrabalhados: normalizacao.intervalosTrabalhados,
    possuiPendenciaDeMarcacao: normalizacao.pendencias.length > 0,
    resultadoJornada,
  });
  const classificacao = params.classificacao
    ? classificarRubricasMct({
        catalogo: params.classificacao.catalogo,
        regras: params.classificacao.regras,
        autorizacoes: params.classificacao.autorizacoes,
        contexto: {
          jornadaExigivelMinutos: resultadoJornada.jornadaExigivelMinutos,
          minutosTrabalhados:
            resultadoJornada.tempoEfetivamenteTrabalhadoMinutos,
          tempoFaltanteMinutos: resultadoJornada.tempoFaltanteMinutos,
          excedenteBrutoMinutos: resultadoJornada.excedenteBrutoMinutos,
          ...params.classificacao.contexto,
        },
      })
    : null;
  const dataReferencia = inicioUtcDoDia(params.dataReferencia);
  const entradaSnapshot = {
    politica: serializar(params.politica),
    plano: params.plano ? serializar(params.plano) : null,
    eventos: normalizacao.eventos.map(serializar),
    pendenciasNormalizacao: normalizacao.pendencias,
    classificacao: params.classificacao
      ? serializar(params.classificacao)
      : null,
  };
  const hashEntrada = hashCanonico(entradaSnapshot);
  const possuiPendencias =
    normalizacao.pendencias.length > 0 ||
    resultadoConformidade.possuiPendencias ||
    resultadoJornada.excedentePendenteMinutos > 0 ||
    Boolean(classificacao?.conflitos.length) ||
    Boolean(
      classificacao?.aplicacoes.some((item) => item.status !== "APLICADA"),
    );
  const resultado: ResultadoExecucaoMctShadow = {
    orgaoId: params.orgaoId,
    servidorId: params.servidorId,
    dataReferencia,
    competencia: dataReferencia.toISOString().slice(0, 7),
    modo: params.modo ?? "SHADOW",
    politicaVersaoId: params.politica.id,
    versaoMotor: MCT_VERSAO_MOTOR,
    hashEntrada,
    entradaSnapshot,
    eventos: normalizacao.eventos,
    segmentos,
    resultadoJornada,
    resultadoConformidade,
    classificacao,
    possuiPendencias,
    memoriaCalculo: {
      versaoMotor: MCT_VERSAO_MOTOR,
      politica: {
        id: params.politica.id,
        versao: params.politica.versao,
      },
      eventosUtilizados: normalizacao.eventos
        .filter((evento) => !evento.duplicadoDe)
        .map((evento) => evento.id),
      pendenciasNormalizacao: normalizacao.pendencias,
      regrasExecutadas: classificacao?.regrasExecutadas ?? [],
      conflitosClassificacao: classificacao?.conflitos ?? [],
      rubricasResultantes: classificacao?.aplicacoes ?? [],
      calculo: {
        jornadaExigivelMinutos: resultadoJornada.jornadaExigivelMinutos,
        tempoEfetivamenteTrabalhadoMinutos:
          resultadoJornada.tempoEfetivamenteTrabalhadoMinutos,
        excedenteBrutoMinutos: resultadoJornada.excedenteBrutoMinutos,
        creditoReconhecidoMinutos:
          resultadoJornada.creditoReconhecidoMinutos,
        excedentePendenteMinutos:
          resultadoJornada.excedentePendenteMinutos,
      },
      observacao:
        params.modo === "MCT"
          ? "Execucao MCT utilizada como fonte da apuracao oficial."
          : "Execucao SHADOW sem efeitos em apuracao, banco de horas, folha ou homologacao.",
    },
  };

  const persistencia = params.repositorio
    ? await params.repositorio.salvarShadow(resultado)
    : null;

  return { resultado, persistencia };
}

function inicioUtcDoDia(data: Date) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

function serializar<T>(valor: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(valor)) as Record<string, unknown>;
}

function hashCanonico(valor: unknown) {
  return createHash("sha256").update(JSON.stringify(ordenar(valor))).digest("hex");
}

function ordenar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (!valor || typeof valor !== "object") return valor;
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, item]) => [chave, ordenar(item)]),
  );
}

