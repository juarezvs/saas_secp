export const TIPOS_DESAFIO_FACIAL = [
  "PISCAR",
  "VIRAR_ESQUERDA",
  "VIRAR_DIREITA",
  "OLHAR_CIMA",
  "OLHAR_BAIXO",
  "SORRIR",
] as const;

export type TipoDesafioFacial = (typeof TIPOS_DESAFIO_FACIAL)[number];

export type DesafioFacial = {
  id: string;
  tipo: TipoDesafioFacial;
  ordem: number;
  tempoLimiteMs: number;
};

export type ResultadoDesafioFacial = {
  desafioId: string;
  tipo: TipoDesafioFacial;
  ordem: number;
  aprovado: boolean;
  duracaoMs: number;
  score: number;
  framesAnalisados: number;
};
