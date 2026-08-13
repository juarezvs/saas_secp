export const REGRAS_ENROLLMENT_FACIAL = {
  duracaoSessaoMs: 5 * 60 * 1000,
  quantidadeDesafios: 3,
  tempoDesafioMs: 6_000,
  minAmostras: 3,
  minQualidadeAmostra: 0.65,
  minScoreDesafio: 0.6,
  minScoreLiveness: 0.7,
  requisitosPorDesafio: {
    PISCAR: { minFrames: 1, duracaoMinimaMs: 0 },
    SORRIR: { minFrames: 2, duracaoMinimaMs: 180 },
    VIRAR_ESQUERDA: { minFrames: 3, duracaoMinimaMs: 250 },
    VIRAR_DIREITA: { minFrames: 3, duracaoMinimaMs: 250 },
    OLHAR_CIMA: { minFrames: 3, duracaoMinimaMs: 250 },
    OLHAR_BAIXO: { minFrames: 3, duracaoMinimaMs: 250 },
  },
  minFramesPassivos: 15,
  minFramesMultiplasFacesConsecutivos: 3,
  minFramesTrocaFaceConsecutivos: 3,
  maxFramesQuaseIdenticosRatio: 0.75,
  minVariacaoMediaFrames: 0.004,
  minConsistenciaIdentidade: 0.78,
} as const;

export const PERMISSOES_BIOMETRIA_FACIAL = {
  cadastrarProprio: [
    "biometriafacial:cadastrar:proprio",
    "biometria:cadastrar:proprio",
  ],
  recadastrarProprio: [
    "biometriafacial:recadastrar:proprio",
    "biometria:cadastrar:proprio",
  ],
  cadastrarTerceiros: [
    "biometriafacial:cadastrar:seccional",
    "biometria:gerenciar:global",
  ],
  recadastrarTerceiros: [
    "biometriafacial:recadastrar:seccional",
    "biometria:gerenciar:global",
  ],
} as const;
