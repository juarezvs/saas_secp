import type {
  EventoTemporal,
  PoliticaJornadaMct,
} from "../../domain/mct.types";
import type { PlanoTemporalDia } from "../../domain/planejador-temporal";
import type {
  ContextoClassificacaoMct,
  RegraClassificacaoMct,
  RubricaClassificacaoMct,
} from "../../domain/classificador-multidimensional";
import {
  compararMctComLegado,
  type ResultadoLegadoComparavel,
} from "../../domain/comparador-legado";
import {
  executarMctShadow,
  type RepositorioExecucaoMct,
} from "./executar-mct-shadow.service";

export interface RepositorioComparacaoMct {
  salvarComparacao(params: {
    execucaoId: string;
    legado: ResultadoLegadoComparavel;
    comparacao: ReturnType<typeof compararMctComLegado>;
  }): Promise<void>;
}

export async function executarComparacaoShadow(params: {
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
  legado: ResultadoLegadoComparavel;
  repositorioExecucao: RepositorioExecucaoMct;
  repositorioComparacao: RepositorioComparacaoMct;
  modo?: "SHADOW" | "MCT";
}) {
  const shadow = await executarMctShadow({
    orgaoId: params.orgaoId,
    servidorId: params.servidorId,
    dataReferencia: params.dataReferencia,
    politica: params.politica,
    eventos: params.eventos,
    plano: params.plano,
    classificacao: params.classificacao,
    repositorio: params.repositorioExecucao,
    modo: params.modo,
  });
  if (!shadow.persistencia) {
    throw new Error("Execucao SHADOW nao foi persistida para comparacao.");
  }
  const comparacao = compararMctComLegado({
    legado: params.legado,
    mct: shadow.resultado.resultadoJornada,
    conformidade: shadow.resultado.resultadoConformidade,
  });
  await params.repositorioComparacao.salvarComparacao({
    execucaoId: shadow.persistencia.id,
    legado: params.legado,
    comparacao,
  });
  return { ...shadow, comparacao };
}
