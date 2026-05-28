"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";

type CameraCaptureProps = {
  modo: "cadastro" | "validacao";
  inputName: "templates" | "template";
};

type FaceDetectada = {
  score?: number;
  embedding?: number[] | Float32Array;
  description?: number[] | Float32Array;
};

type HumanInstance = {
  load: () => Promise<void>;
  warmup: () => Promise<void>;
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
    throw new Error("Não foi possível carregar o construtor do Human.");
  }

  humanSingleton = new HumanConstructor({
    backend: "webgl",
    modelBasePath: "/models/human",
    face: {
      enabled: true,
      detector: {
        enabled: true,
      },
      description: {
        enabled: true,
      },
      mesh: {
        enabled: false,
      },
      iris: {
        enabled: false,
      },
      emotion: {
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
  await humanSingleton.warmup();

  return humanSingleton;
}

export function CameraCapture({ modo, inputName }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [human, setHuman] = useState<HumanInstance | null>(null);
  const [templates, setTemplates] = useState<number[][]>([]);
  const [templateValidacao, setTemplateValidacao] = useState<number[] | null>(
    null,
  );
  const [qualidade, setQualidade] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelado = false;

    async function iniciar() {
      try {
        setCarregando(true);

        const instancia = await carregarHumanNoBrowser();

        if (cancelado) {
          return;
        }

        setHuman(instancia);

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
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar a câmera.",
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
      setErro("Motor biométrico ainda não foi carregado.");
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
        setErro("Não foi possível extrair o template facial.");
        return;
      }

      const vetor = Array.from(descriptor).map(Number);
      const score = typeof face.score === "number" ? face.score : 0;

      setQualidade(score);

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
    <section className="rounded-xl border bg-(--card) p-5 text-(--card-foreground) shadow-sm">
      <h2 className="text-lg font-bold">
        {modo === "cadastro" ? "Captura facial" : "Validação facial"}
      </h2>

      <p className="mt-1 text-sm text-(--muted-foreground)">
        Posicione o rosto de frente para a câmera, em ambiente iluminado.
      </p>

      <input type="hidden" name={inputName} value={valorInput} />
      <input type="hidden" name="qualidade" value={qualidade} />

      <div className="mt-5 flex justify-center">
        <div className="w-full max-w-md overflow-hidden rounded-xl border bg-black shadow-sm">
          <video
            ref={videoRef}
            className="aspect-4/3 w-full object-cover"
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

      <div className="mt-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <p className="text-sm text-(--muted-foreground)">
          Capturas válidas: {capturasAtuais}/{capturasNecessarias}
          {pronto ? " — pronto para enviar." : ""}
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
