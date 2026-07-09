"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { cadastrarFaceServidorAction } from "../../application/actions/cadastrar-face-servidor.action";
import {
  avaliarPoseParaEtapa,
  normalizarAngulosHuman,
  type AngulosFace,
  type EtapaPoseFacial,
} from "../../application/services/biometria-facial-config";

type EtapaCadastro = EtapaPoseFacial | "CONCLUIDO";

type TemplateCapturado = {
  etapa: EtapaPoseFacial;
  template: number[];
  qualidade: number;
  angulos: AngulosFace;
};

type HumanFace = {
  embedding?: number[];
  description?: number[];
  descriptor?: number[];
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
};

type HumanResult = {
  face?: HumanFace[];
};

type HumanInstance = {
  detect: (input: HTMLVideoElement) => Promise<HumanResult>;
  load: () => Promise<void>;
  warmup: () => Promise<void>;
};

const ETAPA_LABEL: Record<EtapaCadastro, string> = {
  FRONTAL: "Olhe para frente e enquadre o rosto no contorno.",
  DIREITA: "Vire levemente o rosto para a direita.",
  ESQUERDA: "Vire levemente o rosto para a esquerda.",
  CONCLUIDO: "Cadastro facial concluido.",
};

const ETAPA_ORDEM: EtapaPoseFacial[] = ["FRONTAL", "DIREITA", "ESQUERDA"];

export function CadastroFacialAutoWizard() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const humanRef = useRef<HumanInstance | null>(null);
  const capturasRef = useRef<TemplateCapturado[]>([]);
  const ultimaCapturaEmRef = useRef(0);
  const etapaRef = useRef<EtapaCadastro>("FRONTAL");
  const salvandoRef = useRef(false);

  const [etapa, setEtapa] = useState<EtapaCadastro>("FRONTAL");
  const [capturas, setCapturas] = useState<TemplateCapturado[]>([]);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState(
    "Inicializando câmera e modelo facial...",
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSaving] = useTransition();

  useEffect(() => {
    etapaRef.current = etapa;
  }, [etapa]);

  useEffect(() => {
    salvandoRef.current = salvando;
  }, [salvando]);

  const salvarCadastro = useCallback(
    (capturasParaSalvar: TemplateCapturado[]) => {
      startSaving(async () => {
        try {
          const templates = capturasParaSalvar.map((item) => item.template);
          const qualidadeMedia = limitar01(
            capturasParaSalvar.reduce((acc, item) => acc + item.qualidade, 0) /
              capturasParaSalvar.length,
          );

          const formData = new FormData();

          formData.set("templates", JSON.stringify(templates));
          formData.set("qualidade", String(qualidadeMedia));
          formData.set(
            "metadados",
            JSON.stringify({
              origem: "CADASTRO_FACIAL_AUTO_WIZARD",
              etapas: capturasParaSalvar.map((item) => ({
                etapa: item.etapa,
                qualidade: item.qualidade,
                angulos: item.angulos,
              })),
              quantidadeAmostras: capturasParaSalvar.length,
              qualidadeMedia,
              versaoAlgoritmo: "human-webgl-face-embedding",
            }),
          );

          const resultado = await cadastrarFaceServidorAction(
            {
              sucesso: false,
              mensagem: null,
            },
            formData,
          );

          if (!resultado.sucesso) {
            setErro(
              resultado.mensagem ??
                "Não foi possível salvar a biometria facial.",
            );
            return;
          }

          setMensagem(
            resultado.mensagem ?? "Biometria facial cadastrada com sucesso.",
          );
        } catch (error) {
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao salvar cadastro facial.",
          );
        }
      });
    },
    [startSaving],
  );

  const detectarECapturar = useCallback(
    async (video: HTMLVideoElement) => {
      const human = humanRef.current;
      const etapaAtual = etapaRef.current;

      if (!human || etapaAtual === "CONCLUIDO" || salvandoRef.current) {
        return;
      }

      const agora = Date.now();

      if (agora - ultimaCapturaEmRef.current < 1200) {
        return;
      }

      const resultado = await human.detect(video);
      const face = resultado.face?.[0];

      if (!face) {
        setMensagem("Nenhum rosto detectado. Posicione o rosto no contorno.");
        return;
      }

      const embedding = face.embedding ?? face.description ?? face.descriptor;

      if (!embedding || !face.box) {
        setMensagem(
          "Rosto detectado, mas o template facial ainda não foi gerado. Mantenha o rosto enquadrado.",
        );
        return;
      }

      const score = limitar01(face.score ?? face.boxScore ?? 0);
      const angulos = normalizarAngulosHuman(face.rotation?.angle);
      const avaliacao = avaliarFace({
        video,
        box: face.box,
        etapa: etapaAtual,
        score,
        angulos,
      });

      setMensagem(avaliacao.mensagem);

      if (!avaliacao.aprovado) {
        return;
      }

      ultimaCapturaEmRef.current = agora;

      const captura: TemplateCapturado = {
        etapa: etapaAtual,
        template: normalizarVetor(Array.from(embedding)),
        qualidade: score,
        angulos,
      };

      const novasCapturas = [...capturasRef.current, captura];

      capturasRef.current = novasCapturas;
      setCapturas(novasCapturas);

      const proxima = obterProximaEtapa(etapaAtual);

      if (proxima === "CONCLUIDO") {
        etapaRef.current = "CONCLUIDO";
        setEtapa("CONCLUIDO");
        setMensagem("Capturas concluídas. Salvando cadastro facial...");
        salvarCadastro(novasCapturas);
        return;
      }

      etapaRef.current = proxima;
      setEtapa(proxima);
      setMensagem(ETAPA_LABEL[proxima]);
    },
    [salvarCadastro],
  );

  useEffect(() => {
    let ativo = true;
    let stream: MediaStream | null = null;
    let animationFrame = 0;

    async function iniciar() {
      try {
        const Human = (await import("@vladmandic/human")).default;

        const human = new Human({
          backend: "webgl",
          modelBasePath: "/models/human",
          face: {
            enabled: true,
            detector: {
              enabled: true,
              rotation: true,
              maxDetected: 1,
            },
            mesh: { enabled: true },
            iris: { enabled: false },
            description: { enabled: true },
            emotion: { enabled: false },
            antispoof: { enabled: false },
            liveness: { enabled: false },
          },
          body: { enabled: false },
          hand: { enabled: false },
          object: { enabled: false },
          gesture: { enabled: false },
        }) as HumanInstance;

        humanRef.current = human;

        setMensagem("Carregando modelo de reconhecimento facial...");
        await human.load();
        await human.warmup();

        setMensagem("Solicitando acesso a câmera...");

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (!ativo || !videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setCameraAtiva(true);
        setCarregando(false);
        setMensagem(ETAPA_LABEL.FRONTAL);

        const detectar = async () => {
          if (!ativo || !videoRef.current || !humanRef.current) {
            return;
          }

          await detectarECapturar(videoRef.current);

          animationFrame = requestAnimationFrame(detectar);
        };

        detectar();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar o cadastro facial.",
        );
        setCarregando(false);
      }
    }

    iniciar();

    return () => {
      ativo = false;
      cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [detectarECapturar]);

  function reiniciar() {
    capturasRef.current = [];
    etapaRef.current = "FRONTAL";
    ultimaCapturaEmRef.current = 0;

    setCapturas([]);
    setEtapa("FRONTAL");
    setErro(null);
    setMensagem(ETAPA_LABEL.FRONTAL);
  }

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3">
        <div className="secp-theme-icon rounded-lg p-3">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-lg font-bold">Cadastro facial automatico</h2>

          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Enquadre o rosto no contorno. O sistema fara as capturas
            automaticamente.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
        <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className="aspect-[4/3] w-full scale-x-[-1] object-cover"
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`h-64 w-48 rounded-[50%] border-4 ${
                etapa === "CONCLUIDO" ? "border-green-400" : "border-white/90"
              } shadow-[0_0_0_999px_rgba(0,0,0,0.35)]`}
            />
          </div>

          {carregando && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Loader2 className="size-4 animate-spin" />
                Preparando...
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-[var(--muted)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
              Etapa atual
            </p>

            <p className="mt-2 text-lg font-bold">{ETAPA_LABEL[etapa]}</p>
          </div>

          <div className="space-y-3">
            {ETAPA_ORDEM.map((item) => {
              const feita = capturas.some((captura) => captura.etapa === item);
              const atual = etapa === item;

              return (
                <div
                  key={item}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    feita
                      ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                      : atual
                        ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-[var(--card)]"
                  }`}
                >
                  {feita ? (
                    <CheckCircle2 className="size-5" />
                  ) : atual ? (
                    <Camera className="size-5" />
                  ) : (
                    <div className="size-5 rounded-full border" />
                  )}

                  <span className="text-sm font-semibold">
                    {item === "FRONTAL"
                      ? "Frontal"
                      : item === "DIREITA"
                        ? "Direita"
                        : "Esquerda"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border p-4 text-sm">
            {erro ? (
              <p className="text-red-600">{erro}</p>
            ) : (
              <p className="text-[var(--muted-foreground)]">{mensagem}</p>
            )}
          </div>

          <button
            type="button"
            onClick={reiniciar}
            disabled={!cameraAtiva || salvando}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:opacity-50"
          >
            <RotateCcw className="size-4" />
            Reiniciar captura
          </button>
        </div>
      </div>
    </section>
  );
}

function obterProximaEtapa(etapa: EtapaCadastro): EtapaCadastro {
  if (etapa === "FRONTAL") {
    return "DIREITA";
  }

  if (etapa === "DIREITA") {
    return "ESQUERDA";
  }

  return "CONCLUIDO";
}

function avaliarFace(params: {
  video: HTMLVideoElement;
  box: [number, number, number, number];
  etapa: EtapaCadastro;
  score: number;
  angulos: AngulosFace;
}) {
  const [x, y, width, height] = params.box;
  const videoWidth = params.video.videoWidth;
  const videoHeight = params.video.videoHeight;
  const centroX = x + width / 2;
  const centroY = y + height / 2;

  const centroOk =
    Math.abs(centroX - videoWidth / 2) < videoWidth * 0.28 &&
    Math.abs(centroY - videoHeight / 2) < videoHeight * 0.25;

  const tamanhoOk = width > videoWidth * 0.18 && width < videoWidth * 0.68;

  if (!centroOk || !tamanhoOk) {
    return {
      aprovado: false,
      mensagem: "Enquadre o rosto dentro do contorno.",
    };
  }

  if (params.etapa !== "CONCLUIDO") {
    return avaliarPoseParaEtapa({
      etapa: params.etapa,
      score: params.score,
      angulos: params.angulos,
    });
  }

  return {
    aprovado: false,
    mensagem: "Cadastro concluido.",
  };
}

function limitar01(valor: number) {
  if (!Number.isFinite(valor)) {
    return 0;
  }

  return Math.min(1, Math.max(0, valor));
}

function normalizarVetor(vetor: number[]) {
  const norma = Math.sqrt(vetor.reduce((acc, valor) => acc + valor * valor, 0));

  if (!norma || !Number.isFinite(norma)) {
    return vetor.map(() => 0);
  }

  return vetor.map((valor) => valor / norma);
}
