import type {
  DesafioFacial,
  ResultadoDesafioFacial,
} from "./challenge.types";
import type {
  MetricasLivenessPassivo,
  ResultadoLiveness,
} from "./liveness.types";

export const POSES_AMOSTRA_FACIAL = [
  "FRONTAL",
  "ESQUERDA",
  "DIREITA",
] as const;

export type PoseAmostraFacial = (typeof POSES_AMOSTRA_FACIAL)[number];

export type AmostraEnrollmentFacial = {
  pose: PoseAmostraFacial;
  template: number[];
  qualidade: number;
  scoreDeteccao: number;
  timestamp: string;
  hashFrame: string;
};

export type SessaoEnrollmentFacialPublica = {
  sessionId: string;
  nonce: string;
  expiresAt: string;
  challengeSequence: DesafioFacial[];
};

export type ConclusaoEnrollmentFacialInput = {
  sessionId: string;
  nonce: string;
  consentimento: boolean;
  desafios: ResultadoDesafioFacial[];
  livenessPassivo: MetricasLivenessPassivo;
  amostras: AmostraEnrollmentFacial[];
  metadados?: Record<string, unknown>;
};

export type ConclusaoEnrollmentFacialResultado = {
  biometriaId: string;
  qualidadeMedia: number;
  liveness: ResultadoLiveness;
  recadastro: boolean;
};
