export const TOTEM_RECONHECIMENTO_FACIAL_SEGURO = {
  similaridadeMinima: 0.85,
  distanciaMaxima: 0.15,
  margemSimilaridadeMinima: 0.08,
  margemDistanciaMinima: 0.04,
  qualidadeMinima: 0.75,
  maxYawGraus: 14,
  maxPitchGraus: 14,
  maxRollGraus: 14,
} as const;

export type CandidatoReconhecimentoTotem<T> = {
  biometria: T;
  distancia: number;
  similaridade: number;
};

export type ResultadoReconhecimentoTotem<T> =
  | {
      seguro: true;
      melhor: CandidatoReconhecimentoTotem<T>;
      segundo: CandidatoReconhecimentoTotem<T> | null;
    }
  | {
      seguro: false;
      motivo: string;
      melhor: CandidatoReconhecimentoTotem<T> | null;
      segundo: CandidatoReconhecimentoTotem<T> | null;
    };

function numeroFinito(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor);
}

export function reconhecerCandidatoTotemSeguro<T>(params: {
  candidatos: Array<CandidatoReconhecimentoTotem<T>>;
  qualidade: number;
  yaw?: number | null;
  pitch?: number | null;
  roll?: number | null;
  limiarDistanciaCadastro?: number | null;
}): ResultadoReconhecimentoTotem<T> {
  const candidatos = [...params.candidatos]
    .filter(
      (candidato) =>
        numeroFinito(candidato.distancia) &&
        numeroFinito(candidato.similaridade),
    )
    .sort((a, b) => a.distancia - b.distancia);
  const melhor = candidatos[0] ?? null;
  const segundo = candidatos[1] ?? null;

  if (!melhor) {
    return {
      seguro: false,
      motivo: "Nenhuma biometria ativa disponivel no escopo do Totem.",
      melhor,
      segundo,
    };
  }

  if (params.qualidade < TOTEM_RECONHECIMENTO_FACIAL_SEGURO.qualidadeMinima) {
    return {
      seguro: false,
      motivo:
        "Face detectada com baixa qualidade. Aproxime o rosto e melhore a iluminacao.",
      melhor,
      segundo,
    };
  }

  const yaw = Math.abs(params.yaw ?? 0);
  const pitch = Math.abs(params.pitch ?? 0);
  const roll = Math.abs(params.roll ?? 0);

  if (
    yaw > TOTEM_RECONHECIMENTO_FACIAL_SEGURO.maxYawGraus ||
    pitch > TOTEM_RECONHECIMENTO_FACIAL_SEGURO.maxPitchGraus ||
    roll > TOTEM_RECONHECIMENTO_FACIAL_SEGURO.maxRollGraus
  ) {
    return {
      seguro: false,
      motivo: "Face detectada fora do enquadramento frontal seguro.",
      melhor,
      segundo,
    };
  }

  const distanciaMaxima = Math.min(
    params.limiarDistanciaCadastro ??
      TOTEM_RECONHECIMENTO_FACIAL_SEGURO.distanciaMaxima,
    TOTEM_RECONHECIMENTO_FACIAL_SEGURO.distanciaMaxima,
  );

  if (
    melhor.similaridade <
      TOTEM_RECONHECIMENTO_FACIAL_SEGURO.similaridadeMinima ||
    melhor.distancia > distanciaMaxima
  ) {
    return {
      seguro: false,
      motivo: "Face detectada, mas sem correspondencia confiavel.",
      melhor,
      segundo,
    };
  }

  if (segundo) {
    const margemSimilaridade = melhor.similaridade - segundo.similaridade;
    const margemDistancia = segundo.distancia - melhor.distancia;

    if (
      margemSimilaridade <
        TOTEM_RECONHECIMENTO_FACIAL_SEGURO.margemSimilaridadeMinima ||
      margemDistancia < TOTEM_RECONHECIMENTO_FACIAL_SEGURO.margemDistanciaMinima
    ) {
      return {
        seguro: false,
        motivo:
          "Reconhecimento facial ambiguo entre cadastros. Registro automatico bloqueado.",
        melhor,
        segundo,
      };
    }
  }

  return {
    seguro: true,
    melhor,
    segundo,
  };
}
