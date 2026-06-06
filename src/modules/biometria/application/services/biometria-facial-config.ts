export type EtapaPoseFacial = "FRONTAL" | "DIREITA" | "ESQUERDA";

export type AngulosFace = {
  yaw: number;
  pitch: number;
  roll: number;
};

export type AvaliacaoPoseFacial = {
  aprovado: boolean;
  mensagem: string;
  pose?: EtapaPoseFacial;
};

export const BIOMETRIA_FACIAL_THRESHOLDS = {
  minTemplateDimensao: 32,
  minAmostrasCadastro: 3,
  minScoreCaptura: 0.65,
  maxYawFrontalGraus: 12,
  minYawLateralGraus: 12,
  maxYawLateralGraus: 38,
  maxPitchGraus: 14,
  maxRollGraus: 14,
  limiarDistanciaCosseno: 0.42,
} as const;

export function radianosParaGraus(valor: number) {
  return valor * (180 / Math.PI);
}

export function normalizarAngulosFace(angulos?: Partial<AngulosFace> | null) {
  return {
    yaw: radianosParaGrausSeNecessario(angulos?.yaw ?? 0),
    pitch: radianosParaGrausSeNecessario(angulos?.pitch ?? 0),
    roll: radianosParaGrausSeNecessario(angulos?.roll ?? 0),
  };
}

export function normalizarAngulosHuman(
  angulos?: Partial<AngulosFace> | null,
) {
  const normalizado = normalizarAngulosFace(angulos);

  return {
    ...normalizado,
    yaw: -normalizado.yaw,
  };
}

export function classificarPoseFacial(angulos?: Partial<AngulosFace> | null) {
  const normalizado = normalizarAngulosFace(angulos);
  const yaw = normalizado.yaw;
  const absYaw = Math.abs(yaw);
  const absPitch = Math.abs(normalizado.pitch);
  const absRoll = Math.abs(normalizado.roll);

  if (
    absPitch > BIOMETRIA_FACIAL_THRESHOLDS.maxPitchGraus ||
    absRoll > BIOMETRIA_FACIAL_THRESHOLDS.maxRollGraus
  ) {
    return {
      pose: "FRONTAL" as EtapaPoseFacial,
      angulos: normalizado,
      dentroDoLimite: false,
    };
  }

  if (absYaw <= BIOMETRIA_FACIAL_THRESHOLDS.maxYawFrontalGraus) {
    return {
      pose: "FRONTAL" as EtapaPoseFacial,
      angulos: normalizado,
      dentroDoLimite: true,
    };
  }

  if (
    absYaw >= BIOMETRIA_FACIAL_THRESHOLDS.minYawLateralGraus &&
    absYaw <= BIOMETRIA_FACIAL_THRESHOLDS.maxYawLateralGraus
  ) {
    return {
      pose: yaw > 0 ? ("ESQUERDA" as const) : ("DIREITA" as const),
      angulos: normalizado,
      dentroDoLimite: true,
    };
  }

  return {
    pose: yaw > 0 ? ("ESQUERDA" as const) : ("DIREITA" as const),
    angulos: normalizado,
    dentroDoLimite: false,
  };
}

export function avaliarPoseParaEtapa(params: {
  etapa: EtapaPoseFacial;
  score: number;
  angulos?: Partial<AngulosFace> | null;
}) {
  if (params.score < BIOMETRIA_FACIAL_THRESHOLDS.minScoreCaptura) {
    return {
      aprovado: false,
      mensagem: `Melhore a iluminacao e mantenha o rosto visivel. Confianca: ${params.score.toFixed(
        2,
      )}`,
    };
  }

  const classificacao = classificarPoseFacial(params.angulos);
  const { yaw, pitch, roll } = classificacao.angulos;

  if (!classificacao.dentroDoLimite) {
    return {
      aprovado: false,
      pose: classificacao.pose,
      mensagem: `Ajuste a posicao do rosto. Yaw ${yaw.toFixed(
        1,
      )} graus, pitch ${pitch.toFixed(1)} graus, roll ${roll.toFixed(
        1,
      )} graus.`,
    };
  }

  if (classificacao.pose !== params.etapa) {
    return {
      aprovado: false,
      pose: classificacao.pose,
      mensagem: mensagemParaEtapa(params.etapa),
    };
  }

  return {
    aprovado: true,
    pose: classificacao.pose,
    mensagem: `Pose ${rotuloPose(params.etapa)} detectada. Capturando...`,
  };
}

function radianosParaGrausSeNecessario(valor: number) {
  if (!Number.isFinite(valor)) {
    return 0;
  }

  return Math.abs(valor) <= Math.PI ? radianosParaGraus(valor) : valor;
}

function rotuloPose(pose: EtapaPoseFacial) {
  if (pose === "DIREITA") {
    return "direita";
  }

  if (pose === "ESQUERDA") {
    return "esquerda";
  }

  return "frontal";
}

function mensagemParaEtapa(etapa: EtapaPoseFacial) {
  if (etapa === "DIREITA") {
    return "Vire levemente o rosto para a direita.";
  }

  if (etapa === "ESQUERDA") {
    return "Vire levemente o rosto para a esquerda.";
  }

  return "Olhe de frente para a camera.";
}
