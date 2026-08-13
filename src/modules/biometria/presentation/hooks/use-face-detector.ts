"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { normalizarAngulosHuman } from "../../application/services/biometria-facial-config";

export type FaceSnapshot = {
  timestamp: number;
  faces: number;
  score: number;
  box: [number, number, number, number] | null;
  embedding: number[] | null;
  yaw: number;
  pitch: number;
  roll: number;
  felicidade: number;
  gestos: string[];
  frameHash: string;
  frameVector: number[];
};

export type FaceSnapshotMultiplo = FaceSnapshot & {
  indice: number;
};

type HumanFace = {
  embedding?: number[] | Float32Array;
  description?: number[] | Float32Array;
  score?: number;
  boxScore?: number;
  box?: [number, number, number, number];
  rotation?: {
    angle?: {
      yaw?: number;
      pitch?: number;
      roll?: number;
    };
  } | null;
  emotion?: Array<{
    emotion?: string;
    score?: number;
  }>;
};

type HumanResult = {
  face?: HumanFace[];
  gesture?: Array<{
    gesture?: string;
  }>;
};

type HumanInstance = {
  load: () => Promise<void>;
  detect: (input: HTMLVideoElement) => Promise<HumanResult>;
};

type HumanConstructor = new (config: Record<string, unknown>) => HumanInstance;

let humanSingleton: HumanInstance | null = null;
let humanLoadingPromise: Promise<HumanInstance> | null = null;

async function carregarHuman() {
  if (humanSingleton) {
    return humanSingleton;
  }

  if (humanLoadingPromise) {
    return humanLoadingPromise;
  }

  humanLoadingPromise = (async () => {
    const mod = await import("@vladmandic/human");
    const Constructor = (mod.default ??
      (mod as unknown as { Human?: HumanConstructor }).Human) as
      | HumanConstructor
      | undefined;

    if (!Constructor) {
      throw new Error("Não foi possível carregar o motor facial.");
    }

    const human = new Constructor({
      backend: "webgl",
      modelBasePath: "/models/human",
      face: {
        enabled: true,
        detector: {
          enabled: true,
          rotation: true,
          maxDetected: 8,
        },
        mesh: { enabled: true },
        iris: { enabled: true },
        description: { enabled: true },
        emotion: { enabled: true },
        antispoof: { enabled: false },
        liveness: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      gesture: { enabled: true },
    });

    await comTimeout(
      human.load(),
      45_000,
      "O reconhecimento facial demorou demais para carregar. Verifique a conexão e tente novamente.",
    );
    humanSingleton = human;
    return human;
  })();

  try {
    return await humanLoadingPromise;
  } catch (error) {
    humanSingleton = null;
    humanLoadingPromise = null;
    throw error;
  }
}

export function useFaceDetector() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pronto, setPronto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const preparar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      await carregarHuman();
      setPronto(true);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o motor facial.",
      );
      throw error;
    } finally {
      setCarregando(false);
    }
  }, []);

  const detectar = useCallback(async (video: HTMLVideoElement) => {
    const human = await carregarHuman();
    const result = await human.detect(video);
    const faces = result.face ?? [];
    const face = faces[0];
    const { hash, vetor } = await criarAssinaturaFrame(video, canvasRef);

    if (!face) {
      return {
        timestamp: Date.now(),
        faces: 0,
        score: 0,
        box: null,
        embedding: null,
        yaw: 0,
        pitch: 0,
        roll: 0,
        felicidade: 0,
        gestos: [],
        frameHash: hash,
        frameVector: vetor,
      } satisfies FaceSnapshot;
    }

    const angulos = normalizarAngulosHuman(face.rotation?.angle);
    const felicidade =
      face.emotion?.find((item) => item.emotion?.toLowerCase() === "happy")
        ?.score ?? 0;

    return {
      timestamp: Date.now(),
      faces: faces.length,
      score: limitar01(face.score ?? face.boxScore ?? 0),
      box: face.box ?? null,
      embedding: face.embedding
        ? Array.from(face.embedding)
        : face.description
          ? Array.from(face.description)
          : null,
      yaw: angulos.yaw,
      pitch: angulos.pitch,
      roll: angulos.roll,
      felicidade: limitar01(felicidade),
      gestos: (result.gesture ?? [])
        .map((item) => item.gesture?.toLowerCase() ?? "")
        .filter(Boolean),
      frameHash: hash,
      frameVector: vetor,
    } satisfies FaceSnapshot;
  }, []);

  const detectarMultiplas = useCallback(async (video: HTMLVideoElement) => {
    const human = await carregarHuman();
    const result = await human.detect(video);
    const faces = result.face ?? [];
    const { hash, vetor } = await criarAssinaturaFrame(video, canvasRef);

    return faces.map((face, indice) => {
      const angulos = normalizarAngulosHuman(face.rotation?.angle);
      const felicidade =
        face.emotion?.find((item) => item.emotion?.toLowerCase() === "happy")
          ?.score ?? 0;

      return {
        timestamp: Date.now(),
        indice,
        faces: faces.length,
        score: limitar01(face.score ?? face.boxScore ?? 0),
        box: face.box ?? null,
        embedding: face.embedding
          ? Array.from(face.embedding)
          : face.description
            ? Array.from(face.description)
            : null,
        yaw: angulos.yaw,
        pitch: angulos.pitch,
        roll: angulos.roll,
        felicidade: limitar01(felicidade),
        gestos: (result.gesture ?? [])
          .map((item) => item.gesture?.toLowerCase() ?? "")
          .filter(Boolean),
        frameHash: `${hash}-${indice}`,
        frameVector: vetor,
      } satisfies FaceSnapshotMultiplo;
    });
  }, []);

  useEffect(() => {
    return () => {
      canvasRef.current = null;
    };
  }, []);

  return {
    pronto,
    carregando,
    erro,
    preparar,
    detectar,
    detectarMultiplas,
  };
}

async function criarAssinaturaFrame(
  video: HTMLVideoElement,
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
) {
  const canvas = canvasRef.current ?? document.createElement("canvas");
  canvasRef.current = canvas;
  canvas.width = 32;
  canvas.height = 24;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return { hash: "frame-indisponivel", vetor: [] };
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const vetor: number[] = [];

  for (let index = 0; index < pixels.length; index += 16) {
    vetor.push(
      (pixels[index] + pixels[index + 1] + pixels[index + 2]) / (3 * 255),
    );
  }

  const bytes = new TextEncoder().encode(
    vetor.map((item) => item.toFixed(3)).join(","),
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return {
    hash: Array.from(new Uint8Array(digest))
      .map((item) => item.toString(16).padStart(2, "0"))
      .join(""),
    vetor,
  };
}

function limitar01(valor: number) {
  return Number.isFinite(valor) ? Math.max(0, Math.min(1, valor)) : 0;
}

function comTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  mensagem: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error(mensagem)),
      timeoutMs,
    );

    promise.then(
      (resultado) => {
        window.clearTimeout(timeout);
        resolve(resultado);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
