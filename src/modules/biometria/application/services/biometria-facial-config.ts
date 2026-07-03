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
      mensagem:
        "Melhore a iluminação e mantenha o rosto visível dentro da moldura.",
    };
  }

  const classificacao = classificarPoseFacial(params.angulos);

  if (!classificacao.dentroDoLimite) {
    return {
      aprovado: false,
      pose: classificacao.pose,
      mensagem: mensagemAjustePose(classificacao.angulos, params.etapa),
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
    mensagem: `Rosto ${rotuloPose(params.etapa)} detectado. Capturando...`,
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
    return "voltado para a direita";
  }

  if (pose === "ESQUERDA") {
    return "voltado para a esquerda";
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

  return "Olhe de frente para a câmera.";
}

function mensagemAjustePose(angulos: AngulosFace, etapa: EtapaPoseFacial) {
  const ajustes: string[] = [];

  if (Math.abs(angulos.roll) > BIOMETRIA_FACIAL_THRESHOLDS.maxRollGraus) {
    ajustes.push("deixe a cabeça mais reta, sem inclinar para os lados");
  }

  if (Math.abs(angulos.pitch) > BIOMETRIA_FACIAL_THRESHOLDS.maxPitchGraus) {
    ajustes.push("mantenha o queixo mais alinhado, sem olhar para cima ou para baixo");
  }

  const yawForaDoLimite =
    etapa === "FRONTAL"
      ? Math.abs(angulos.yaw) > BIOMETRIA_FACIAL_THRESHOLDS.maxYawFrontalGraus
      : Math.abs(angulos.yaw) >
          BIOMETRIA_FACIAL_THRESHOLDS.maxYawLateralGraus;

  if (yawForaDoLimite) {
    ajustes.push(
      etapa === "FRONTAL"
        ? "olhe mais de frente para a câmera"
        : "vire menos o rosto, mantendo apenas uma leve rotação",
    );
  }

  if (ajustes.length === 0) {
    return "Ajuste o rosto dentro da moldura e tente manter a posição por alguns segundos.";
  }

  return `Ajuste a posição do rosto: ${formatarLista(ajustes)}.`;
}

function formatarLista(itens: string[]) {
  if (itens.length <= 1) {
    return itens[0] ?? "";
  }

  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}
