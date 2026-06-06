import { REGRAS_ENROLLMENT_FACIAL } from "../../domain/biometria-facial.rules";
import type { DesafioFacial, ResultadoDesafioFacial } from "../../domain/challenge.types";
import type {
  MetricasLivenessPassivo,
  ResultadoLiveness,
} from "../../domain/liveness.types";

export function validarResultadoLiveness(params: {
  desafiosEsperados: DesafioFacial[];
  resultados: ResultadoDesafioFacial[];
  passivo: MetricasLivenessPassivo;
}): ResultadoLiveness {
  const ordemValida =
    params.desafiosEsperados.length === params.resultados.length &&
    params.desafiosEsperados.every((esperado, index) => {
      const resultado = params.resultados[index];

      return (
        resultado?.desafioId === esperado.id &&
        resultado.tipo === esperado.tipo &&
        resultado.ordem === esperado.ordem &&
        resultado.duracaoMs > 0 &&
        resultado.duracaoMs <= esperado.tempoLimiteMs &&
        resultado.framesAnalisados >=
          REGRAS_ENROLLMENT_FACIAL.requisitosPorDesafio[esperado.tipo]
            .minFrames
      );
    });

  const desafiosAprovados = params.resultados.filter(
    (item) =>
      item.aprovado &&
      item.score >= REGRAS_ENROLLMENT_FACIAL.minScoreDesafio,
  ).length;
  const ratioFramesIguais =
    params.passivo.framesAnalisados > 0
      ? params.passivo.framesQuaseIdenticos /
        params.passivo.framesAnalisados
      : 1;
  const framesSuficientes =
    params.passivo.framesAnalisados >=
    REGRAS_ENROLLMENT_FACIAL.minFramesPassivos;
  const variacaoSuficiente =
    params.passivo.variacaoMediaFrames >=
    REGRAS_ENROLLMENT_FACIAL.minVariacaoMediaFrames;
  const proporcaoFramesIguaisValida =
    ratioFramesIguais <=
    REGRAS_ENROLLMENT_FACIAL.maxFramesQuaseIdenticosRatio;
  const consistenciaIdentidadeValida =
    params.passivo.consistenciaIdentidade >=
    REGRAS_ENROLLMENT_FACIAL.minConsistenciaIdentidade;
  const apenasUmaPessoa = !params.passivo.multiplasFacesDetectadas;
  const semTrocaDeFace = !params.passivo.trocaFaceDetectada;
  const passivoAprovado =
    framesSuficientes &&
    variacaoSuficiente &&
    proporcaoFramesIguaisValida &&
    consistenciaIdentidadeValida &&
    apenasUmaPessoa &&
    semTrocaDeFace;
  const scoreDesafios =
    params.resultados.length > 0
      ? params.resultados.reduce((total, item) => total + item.score, 0) /
        params.resultados.length
      : 0;
  const scorePassivo = [
    Math.min(1, params.passivo.variacaoMediaFrames / 0.02),
    1 - Math.min(1, ratioFramesIguais),
    params.passivo.consistenciaIdentidade,
  ].reduce((total, item) => total + item, 0) / 3;
  const score = Math.max(0, Math.min(1, scoreDesafios * 0.65 + scorePassivo * 0.35));
  const scoreSuficiente =
    score >= REGRAS_ENROLLMENT_FACIAL.minScoreLiveness;
  const aprovado =
    ordemValida &&
    desafiosAprovados === params.desafiosEsperados.length &&
    passivoAprovado &&
    scoreSuficiente;

  return {
    aprovado,
    score,
    desafiosAprovados,
    totalDesafios: params.desafiosEsperados.length,
    passivo: params.passivo,
    diagnostico: {
      ordemValida,
      framesSuficientes,
      variacaoSuficiente,
      proporcaoFramesIguaisValida,
      consistenciaIdentidadeValida,
      apenasUmaPessoa,
      semTrocaDeFace,
      scoreSuficiente,
    },
  };
}
