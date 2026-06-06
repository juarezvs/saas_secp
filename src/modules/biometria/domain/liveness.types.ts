export type MetricasLivenessPassivo = {
  framesAnalisados: number;
  variacaoMediaFrames: number;
  framesQuaseIdenticos: number;
  multiplasFacesDetectadas: boolean;
  trocaFaceDetectada: boolean;
  consistenciaIdentidade: number;
};

export type ResultadoLiveness = {
  aprovado: boolean;
  score: number;
  desafiosAprovados: number;
  totalDesafios: number;
  passivo: MetricasLivenessPassivo;
  diagnostico: {
    ordemValida: boolean;
    framesSuficientes: boolean;
    variacaoSuficiente: boolean;
    proporcaoFramesIguaisValida: boolean;
    consistenciaIdentidadeValida: boolean;
    apenasUmaPessoa: boolean;
    semTrocaDeFace: boolean;
    scoreSuficiente: boolean;
  };
};
