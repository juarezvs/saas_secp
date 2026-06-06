"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";

import {
  avaliarPoseParaEtapa,
  normalizarAngulosHuman,
} from "../../application/services/biometria-facial-config";

type CameraCaptureProps = {
  modo: "cadastro" | "validacao";
  inputName: "templates" | "template";
  compact?: boolean;
};

type FaceDetectada = {
  score?: number;
  boxScore?: number;
  embedding?: number[] | Float32Array;
  description?: number[] | Float32Array;
  rotation?: {
    angle?: {
      yaw?: number;
      pitch?: number;
      roll?: number;
    };
  } | null;
};

type HumanInstance = {
  load: () => Promise<void>;
  detect: (input: HTMLVideoElement) => Promise<{
    face?: FaceDetectada[];
  }>;
};

type HumanConstructor = new (config: Record<string, unknown>) => HumanInstance;

let humanSingleton: HumanInstance | null = null;

async function carregarHumanNoBrowser() {
  if (humanSingleton) {
    return humanSingleton;
  }

  if (typeof window === "undefined") {
    throw new Error("Human deve ser carregado apenas no navegador.");
  }

  const mod = await import("@vladmandic/human");
  const HumanConstructor = (mod.default ??
    (mod as unknown as { Human?: HumanConstructor }).Human) as
    | HumanConstructor
    | undefined;

  if (!HumanConstructor) {
    throw new Error("Nao foi possivel carregar o construtor do Human.");
  }

  humanSingleton = new HumanConstructor({
    backend: "webgl",
    modelBasePath: "/models/human",
    face: {
      enabled: true,
      detector: {
        enabled: true,
        rotation: true,
        maxDetected: 1,
      },
      description: {
        enabled: true,
      },
      mesh: {
        enabled: true,
      },
      iris: {
        enabled: false,
      },
      emotion: {
        enabled: false,
      },
      antispoof: {
        enabled: false,
      },
      liveness: {
        enabled: false,
      },
    },
    body: {
      enabled: false,
    },
    hand: {
      enabled: false,
    },
    object: {
      enabled: false,
    },
    gesture: {
      enabled: false,
    },
  });

  await humanSingleton.load();

  return humanSingleton;
}

export function CameraCapture({
  modo,
  inputName,
  compact = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [human, setHuman] = useState<HumanInstance | null>(null);
  const [templates, setTemplates] = useState<number[][]>([]);
  const [templateValidacao, setTemplateValidacao] = useState<number[] | null>(
    null,
  );
  const [qualidade, setQualidade] = useState(0);
  const [metadados, setMetadados] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelado = false;

    async function iniciar() {
      try {
        setCarregando(true);

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 640,
            },
            height: {
              ideal: 480,
            },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const instancia = await carregarHumanNoBrowser();

        if (cancelado) {
          return;
        }

        setHuman(instancia);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Nao foi possivel iniciar a camera.",
        );
      } finally {
        setCarregando(false);
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function capturar() {
    if (!videoRef.current) {
      return;
    }

    if (!human) {
      setErro("Motor biometrico ainda nao foi carregado.");
      return;
    }

    setErro(null);
    setCarregando(true);

    try {
      const result = await human.detect(videoRef.current);
      const face = result.face?.[0];

      if (!face) {
        setErro(
          "Nenhuma face detectada. Ajuste o enquadramento e tente novamente.",
        );
        return;
      }

      const descriptor = face.embedding ?? face.description;

      if (!descriptor || descriptor.length === 0) {
        setErro("Nao foi possivel extrair o template facial.");
        return;
      }

      const score = limitar01(face.score ?? face.boxScore ?? 0);
      const angulos = normalizarAngulosHuman(face.rotation?.angle);
      const avaliacao = avaliarPoseParaEtapa({
        etapa: "FRONTAL",
        score,
        angulos,
      });

      if (!avaliacao.aprovado) {
        setErro(avaliacao.mensagem);
        return;
      }

      const vetor = Array.from(descriptor).map(Number);

      setQualidade(score);
      setMetadados({
        origem: modo === "cadastro" ? "CADASTRO_WEB" : "VALIDACAO_WEB",
        pose: avaliacao.pose ?? "FRONTAL",
        ...angulos,
      });

      if (modo === "cadastro") {
        setTemplates((atual) => [...atual, vetor].slice(-5));
      } else {
        setTemplateValidacao(vetor);
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao processar a captura facial.",
      );
    } finally {
      setCarregando(false);
    }
  }

  const valorInput =
    modo === "cadastro"
      ? JSON.stringify(templates)
      : JSON.stringify(templateValidacao ?? []);

  const capturasNecessarias = modo === "cadastro" ? 3 : 1;
  const capturasAtuais =
    modo === "cadastro" ? templates.length : templateValidacao ? 1 : 0;

  const pronto = capturasAtuais >= capturasNecessarias;

  return (
    <section
      className={
        compact
          ? "space-y-3"
          : "rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
      }
    >
      <h2 className={compact ? "font-semibold" : "text-lg font-bold"}>
        {modo === "cadastro" ? "Captura facial" : "Validacao facial"}
      </h2>

      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Posicione o rosto de frente para a camera, em ambiente iluminado.
      </p>

      <input type="hidden" name={inputName} value={valorInput} />
      <input type="hidden" name="qualidade" value={qualidade} />
      <input type="hidden" name="metadados" value={JSON.stringify(metadados)} />

      <div className={compact ? "flex justify-center" : "mt-5 flex justify-center"}>
        <div
          className={
            compact
              ? "w-56 max-w-full overflow-hidden rounded-md border bg-black shadow-sm"
              : "w-full max-w-md overflow-hidden rounded-xl border bg-black shadow-sm"
          }
        >
          <video
            ref={videoRef}
            className={
              compact
                ? "aspect-square w-full scale-x-[-1] object-cover"
                : "aspect-4/3 w-full scale-x-[-1] object-cover"
            }
            muted
            playsInline
          />
        </div>
      </div>

      {erro && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {erro}
        </div>
      )}

      <div
        className={
          compact
            ? "flex flex-col gap-3"
            : "mt-4 flex flex-col justify-between gap-3 md:flex-row md:items-center"
        }
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          Capturas validas: {capturasAtuais}/{capturasNecessarias}
          {pronto ? " - pronto para enviar." : ""}
        </p>

        <button
          type="button"
          onClick={capturar}
          disabled={carregando || !human}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
        >
          {carregando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : pronto ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Camera className="size-4" />
          )}
          {human ? "Capturar face" : "Carregando motor facial..."}
        </button>
      </div>
    </section>
  );
}

function limitar01(valor: number) {
  if (!Number.isFinite(valor)) {
    return 0;
  }

  return Math.max(0, Math.min(1, valor));
}
