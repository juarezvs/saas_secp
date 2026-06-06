"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  POSES_AMOSTRA_FACIAL,
  type AmostraEnrollmentFacial,
  type PoseAmostraFacial,
} from "../../../domain/biometria-facial.types";
import type { MetricasLivenessPassivo } from "../../../domain/liveness.types";
import { REGRAS_ENROLLMENT_FACIAL } from "../../../domain/biometria-facial.rules";
import { useCameraStream } from "../../hooks/use-camera-stream";
import {
  useFaceDetector,
  type FaceSnapshot,
} from "../../hooks/use-face-detector";
import { useFacialEnrollment } from "../../hooks/use-facial-enrollment";
import { useLivenessChallenge } from "../../hooks/use-liveness-challenge";
import { CadastroFacialResult } from "./cadastro-facial-result";
import {
  CameraCheckStep,
  CameraPreview,
} from "./camera-check-step";
import { ConsentimentoBiometriaCard } from "./consentimento-biometria-card";
import {
  FaceQualityPanel,
  type IndicadoresQualidade,
} from "./face-quality-panel";
import { FacialSamplesStep } from "./facial-samples-step";
import { LivenessChallengeStep } from "./liveness-challenge-step";

type Etapa =
  | "CONSENTIMENTO"
  | "PREPARACAO"
  | "CARREGANDO_MODELO"
  | "QUALIDADE"
  | "LIVENESS"
  | "AMOSTRAS"
  | "RESULTADO";

type ResultadoCadastro = {
  qualidade: string;
  provaDeVida: string;
  concluidoEm: string;
  recadastro: boolean;
};

const INDICADORES_INICIAIS: IndicadoresQualidade = {
  rostoDetectado: false,
  centralizado: false,
  iluminacao: false,
  nitidez: false,
  apenasUmaPessoa: false,
};

export function CadastroFacialEnrollmentWizard({
  modo,
}: {
  modo: "cadastro" | "recadastro";
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const estabilidadeDesdeRef = useRef<number | null>(null);
  const ultimaAmostraEmRef = useRef(0);
  const amostrasRef = useRef<AmostraEnrollmentFacial[]>([]);
  const passivoRef = useRef(criarAcumuladorPassivo());
  const finalizandoRef = useRef(false);
  const [etapa, setEtapa] = useState<Etapa>("CONSENTIMENTO");
  const [indicadores, setIndicadores] = useState(INDICADORES_INICIAIS);
  const [mensagem, setMensagem] = useState("Posicione o rosto dentro da moldura.");
  const [amostras, setAmostras] = useState<AmostraEnrollmentFacial[]>([]);
  const [resultado, setResultado] = useState<ResultadoCadastro | null>(null);
  const [erroFluxo, setErroFluxo] = useState<string | null>(null);
  const {
    stream,
    carregando: cameraCarregando,
    erro: cameraErro,
    iniciar: iniciarCamera,
    parar: pararCamera,
  } = useCameraStream();
  const {
    pronto: detectorPronto,
    carregando: detectorCarregando,
    erro: detectorErro,
    preparar: prepararDetector,
    detectar,
  } = useFaceDetector();
  const {
    sessao,
    carregando: enrollmentCarregando,
    erro: enrollmentErro,
    iniciar: iniciarEnrollment,
    concluir: concluirEnrollment,
  } = useFacialEnrollment();
  const desafios = sessao?.challengeSequence ?? [];
  const liveness = useLivenessChallenge(desafios);

  const poseAtual =
    etapa === "AMOSTRAS"
      ? (POSES_AMOSTRA_FACIAL[amostras.length] ?? null)
      : null;

  useEffect(() => {
    if (!videoRef.current || !stream) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = stream;

    const reproduzir = () => {
      void video.play().catch(() => {
        setErroFluxo(
          "A camera foi liberada, mas o navegador bloqueou a exibicao do video. Tente novamente.",
        );
      });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      reproduzir();
      return;
    }

    video.addEventListener("loadedmetadata", reproduzir, { once: true });
    return () => video.removeEventListener("loadedmetadata", reproduzir);
  }, [stream]);

  const iniciar = useCallback(async () => {
    try {
      await iniciarEnrollment(modo);
      setEtapa("PREPARACAO");
    } catch {
      // O hook ja fornece mensagem segura para a interface.
    }
  }, [iniciarEnrollment, modo]);

  const verificarCamera = useCallback(async () => {
    setErroFluxo(null);

    try {
      await iniciarCamera();
      setMensagem("Camera ativa. Preparando o reconhecimento facial...");
      setEtapa("CARREGANDO_MODELO");
      await aguardarRenderizacao();
      await prepararDetector();
      setEtapa("QUALIDADE");
      setMensagem("Posicione o rosto dentro da moldura.");
    } catch (error) {
      setEtapa("PREPARACAO");
      setErroFluxo(
        error instanceof Error
          ? error.message
          : cameraErro ??
              detectorErro ??
              "Nao foi possivel preparar a camera e o reconhecimento facial.",
      );
    }
  }, [cameraErro, detectorErro, iniciarCamera, prepararDetector]);

  const finalizar = useCallback(
    async (capturas: AmostraEnrollmentFacial[]) => {
      if (
        !sessao ||
        finalizandoRef.current ||
        liveness.resultados.length !== desafios.length
      ) {
        return;
      }

      finalizandoRef.current = true;
      setMensagem("Protegendo e salvando o template facial...");
      const passivo = consolidarPassivo(passivoRef.current);

      try {
        const salvo = await concluirEnrollment({
          sessionId: sessao.sessionId,
          nonce: sessao.nonce,
          consentimento: true,
          desafios: liveness.resultados,
          livenessPassivo: passivo,
          amostras: capturas,
          metadados: {
            navegador: navigator.userAgent,
            modelo: "@vladmandic/human",
            imagensBrutasArmazenadas: false,
          },
        });

        pararCamera();
        setResultado(salvo);
        setEtapa("RESULTADO");
      } catch (error) {
        setErroFluxo(
          error instanceof Error
            ? error.message
            : "Nao foi possivel concluir o cadastro facial.",
        );
      } finally {
        finalizandoRef.current = false;
      }
    },
    [
      concluirEnrollment,
      desafios.length,
      liveness.resultados,
      pararCamera,
      sessao,
    ],
  );

  const processarSnapshot = useCallback(
    (snapshot: FaceSnapshot) => {
      atualizarPassivo(passivoRef.current, snapshot);

      if (etapa === "QUALIDADE") {
        const avaliacao = avaliarQualidade(snapshot, videoRef.current);
        setIndicadores(avaliacao.indicadores);
        setMensagem(avaliacao.mensagem);

        if (avaliacao.aprovado) {
          estabilidadeDesdeRef.current ??= Date.now();

          if (Date.now() - estabilidadeDesdeRef.current >= 1_500) {
            setEtapa("LIVENESS");
            setMensagem("Siga o desafio apresentado.");
          }
        } else {
          estabilidadeDesdeRef.current = null;
        }

        return;
      }

      if (etapa === "LIVENESS") {
        if (snapshot.faces !== 1) {
          setMensagem(
            snapshot.faces > 1
              ? "Mantenha apenas uma pessoa visivel na camera."
              : "Mantenha o rosto dentro da moldura.",
          );
          return;
        }

        const concluiuDesafios = liveness.processar(snapshot);

        if (concluiuDesafios) {
          setEtapa("AMOSTRAS");
          setMensagem("Prova de vida concluida. Iniciando capturas faciais.");
        }
        return;
      }

      if (etapa !== "AMOSTRAS" || !poseAtual) {
        return;
      }

      const captura = criarAmostra(snapshot, poseAtual);

      if (!captura) {
        setMensagem(mensagemPose(poseAtual));
        return;
      }

      if (Date.now() - ultimaAmostraEmRef.current < 1_200) {
        return;
      }

      ultimaAmostraEmRef.current = Date.now();
      const novas = [...amostrasRef.current, captura];
      amostrasRef.current = novas;
      setAmostras(novas);
      setMensagem("Amostra capturada.");

      if (novas.length === POSES_AMOSTRA_FACIAL.length) {
        void finalizar(novas);
      }
    },
    [etapa, finalizar, liveness, poseAtual],
  );

  useEffect(() => {
    if (
      !["QUALIDADE", "LIVENESS", "AMOSTRAS"].includes(etapa) ||
      !stream ||
      !detectorPronto
    ) {
      return;
    }

    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const executar = async () => {
      if (!ativo || !videoRef.current) {
        return;
      }

      try {
        if (
          sessao &&
          new Date(sessao.expiresAt).getTime() <= Date.now()
        ) {
          setErroFluxo("A sessao de cadastro expirou. Inicie novamente.");
          pararCamera();
          return;
        }

        const snapshot = await detectar(videoRef.current);

        if (ativo) {
          processarSnapshot(snapshot);
        }
      } catch {
        if (ativo) {
          setMensagem("Mantenha o rosto visivel e tente novamente.");
        }
      }

      if (ativo) {
        timer = setTimeout(executar, etapa === "LIVENESS" ? 120 : 350);
      }
    };

    void executar();

    return () => {
      ativo = false;
      if (timer) clearTimeout(timer);
    };
  }, [
    detectar,
    detectorPronto,
    etapa,
    pararCamera,
    processarSnapshot,
    sessao,
    stream,
  ]);

  const statusCamera = useMemo(() => {
    if (erroFluxo) return erroFluxo;
    if (enrollmentCarregando) return "Processando...";
    return mensagem;
  }, [enrollmentCarregando, erroFluxo, mensagem]);

  if (etapa === "CONSENTIMENTO") {
    return (
      <ConsentimentoBiometriaCard
        carregando={enrollmentCarregando}
        erro={enrollmentErro}
        onIniciar={() => void iniciar()}
      />
    );
  }

  if (etapa === "PREPARACAO") {
    return (
      <CameraCheckStep
        videoRef={videoRef}
        carregando={cameraCarregando || detectorCarregando}
        erro={erroFluxo ?? cameraErro ?? detectorErro}
        cameraAtiva={Boolean(stream && detectorPronto)}
        onVerificar={() => void verificarCamera()}
      />
    );
  }

  if (etapa === "RESULTADO" && resultado) {
    return (
      <CadastroFacialResult
        resultado={resultado}
        onRefazer={() => window.location.reload()}
      />
    );
  }

  if (etapa === "CARREGANDO_MODELO") {
    return (
      <section className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr] lg:items-start">
        <CameraPreview
          videoRef={videoRef}
          status="Camera ativa. Carregando reconhecimento facial..."
        />

        <div
          className="rounded-xl border bg-[var(--card)] p-6 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <Loader2
              className="size-5 animate-spin text-blue-800 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2 className="text-lg font-bold">
              Preparando reconhecimento facial
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
            A camera ja esta ativa. Aguarde enquanto os modelos de analise
            facial sao carregados no navegador.
          </p>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Na primeira utilizacao, esta etapa pode levar alguns segundos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr] lg:items-start">
      <CameraPreview videoRef={videoRef} status={statusCamera} />

      {etapa === "QUALIDADE" && (
        <FaceQualityPanel indicadores={indicadores} mensagem={mensagem} />
      )}

      {etapa === "LIVENESS" && (
        <LivenessChallengeStep
          desafio={liveness.desafioAtual}
          atual={liveness.resultados.length}
          total={desafios.length}
        />
      )}

      {etapa === "AMOSTRAS" && (
        <FacialSamplesStep
          poseAtual={poseAtual}
          posesCapturadas={amostras.map((item) => item.pose)}
        />
      )}
    </section>
  );
}

function avaliarQualidade(
  snapshot: FaceSnapshot,
  video: HTMLVideoElement | null,
) {
  const rostoDetectado = snapshot.faces >= 1;
  const apenasUmaPessoa = snapshot.faces === 1;
  const iluminacao = snapshot.score >= 0.62;
  const nitidez = snapshot.score >= 0.68 && snapshot.frameVector.length > 0;
  let centralizado = false;

  if (video && snapshot.box) {
    const [x, y, width, height] = snapshot.box;
    const centroX = x + width / 2;
    const centroY = y + height / 2;
    centralizado =
      Math.abs(centroX - video.videoWidth / 2) < video.videoWidth * 0.22 &&
      Math.abs(centroY - video.videoHeight / 2) < video.videoHeight * 0.22 &&
      width > video.videoWidth * 0.18 &&
      width < video.videoWidth * 0.7;
  }

  const indicadores = {
    rostoDetectado,
    centralizado,
    iluminacao,
    nitidez,
    apenasUmaPessoa,
  };
  const aprovado = Object.values(indicadores).every(Boolean);
  const mensagem = aprovado
    ? "Mantenha a posicao por alguns segundos."
    : snapshot.faces > 1
      ? "Mantenha apenas uma pessoa visivel na camera."
      : !rostoDetectado
        ? "Centralize o rosto dentro da moldura."
        : !centralizado
          ? "Ajuste a distancia e centralize o rosto."
          : "Melhore a iluminacao e mantenha o rosto visivel.";

  return { indicadores, aprovado, mensagem };
}

function criarAmostra(
  snapshot: FaceSnapshot,
  pose: PoseAmostraFacial,
): AmostraEnrollmentFacial | null {
  if (
    snapshot.faces !== 1 ||
    !snapshot.embedding ||
    snapshot.score < 0.65 ||
    !poseCorresponde(snapshot, pose)
  ) {
    return null;
  }

  return {
    pose,
    template: normalizarVetor(snapshot.embedding),
    qualidade: snapshot.score,
    scoreDeteccao: snapshot.score,
    timestamp: new Date(snapshot.timestamp).toISOString(),
    hashFrame: snapshot.frameHash,
  };
}

function poseCorresponde(snapshot: FaceSnapshot, pose: PoseAmostraFacial) {
  if (Math.abs(snapshot.roll) > 15) return false;
  if (pose === "FRONTAL") {
    return Math.abs(snapshot.yaw) <= 10 && Math.abs(snapshot.pitch) <= 10;
  }
  if (pose === "ESQUERDA") return snapshot.yaw >= 12 && snapshot.yaw <= 38;
  return snapshot.yaw <= -12 && snapshot.yaw >= -38;
}

function mensagemPose(pose: PoseAmostraFacial) {
  const mensagens: Record<PoseAmostraFacial, string> = {
    FRONTAL: "Olhe de frente para a camera.",
    ESQUERDA: "Vire levemente o rosto para a esquerda.",
    DIREITA: "Vire levemente o rosto para a direita.",
  };

  return mensagens[pose];
}

function normalizarVetor(vetor: number[]) {
  const norma = Math.sqrt(vetor.reduce((total, item) => total + item * item, 0));
  return norma > 0 ? vetor.map((item) => item / norma) : vetor;
}

function criarAcumuladorPassivo() {
  return {
    frames: 0,
    somaVariacao: 0,
    quaseIdenticos: 0,
    multiplasFaces: false,
    multiplasFacesConsecutivas: 0,
    trocaFace: false,
    trocaFaceConsecutiva: 0,
    somaConsistencia: 0,
    comparacoesIdentidade: 0,
    frameAnterior: null as number[] | null,
    embeddingAnterior: null as number[] | null,
  };
}

function atualizarPassivo(
  acumulador: ReturnType<typeof criarAcumuladorPassivo>,
  snapshot: FaceSnapshot,
) {
  acumulador.frames += 1;

  if (snapshot.faces > 1) {
    acumulador.multiplasFacesConsecutivas += 1;
    acumulador.multiplasFaces ||=
      acumulador.multiplasFacesConsecutivas >=
      REGRAS_ENROLLMENT_FACIAL.minFramesMultiplasFacesConsecutivos;
  } else {
    acumulador.multiplasFacesConsecutivas = 0;
  }

  if (acumulador.frameAnterior && snapshot.frameVector.length > 0) {
    const variacao = diferencaMedia(
      acumulador.frameAnterior,
      snapshot.frameVector,
    );
    acumulador.somaVariacao += variacao;
    if (variacao < 0.002) acumulador.quaseIdenticos += 1;
  }

  if (snapshot.frameVector.length > 0) {
    acumulador.frameAnterior = snapshot.frameVector;
  }

  if (snapshot.embedding) {
    if (acumulador.embeddingAnterior) {
      const consistencia = similaridadeCosseno(
        acumulador.embeddingAnterior,
        snapshot.embedding,
      );
      acumulador.somaConsistencia += consistencia;
      acumulador.comparacoesIdentidade += 1;

      if (consistencia < 0.5) {
        acumulador.trocaFaceConsecutiva += 1;
        acumulador.trocaFace ||=
          acumulador.trocaFaceConsecutiva >=
          REGRAS_ENROLLMENT_FACIAL.minFramesTrocaFaceConsecutivos;
      } else {
        acumulador.trocaFaceConsecutiva = 0;
      }
    }

    acumulador.embeddingAnterior = snapshot.embedding;
  }
}

function consolidarPassivo(
  acumulador: ReturnType<typeof criarAcumuladorPassivo>,
): MetricasLivenessPassivo {
  return {
    framesAnalisados: acumulador.frames,
    variacaoMediaFrames:
      acumulador.frames > 1
        ? acumulador.somaVariacao / (acumulador.frames - 1)
        : 0,
    framesQuaseIdenticos: acumulador.quaseIdenticos,
    multiplasFacesDetectadas: acumulador.multiplasFaces,
    trocaFaceDetectada: acumulador.trocaFace,
    consistenciaIdentidade:
      acumulador.comparacoesIdentidade > 0
        ? limitarEntreZeroEUm(
            acumulador.somaConsistencia / acumulador.comparacoesIdentidade,
          )
        : 0,
  };
}

function diferencaMedia(a: number[], b: number[]) {
  const tamanho = Math.min(a.length, b.length);
  if (tamanho === 0) return 0;

  let total = 0;
  for (let index = 0; index < tamanho; index += 1) {
    total += Math.abs(a[index] - b[index]);
  }
  return total / tamanho;
}

function similaridadeCosseno(a: number[], b: number[]) {
  const tamanho = Math.min(a.length, b.length);
  let produto = 0;
  let normaA = 0;
  let normaB = 0;

  for (let index = 0; index < tamanho; index += 1) {
    produto += a[index] * b[index];
    normaA += a[index] * a[index];
    normaB += b[index] * b[index];
  }

  const divisor = Math.sqrt(normaA) * Math.sqrt(normaB);
  return divisor > 0 ? produto / divisor : 0;
}

function limitarEntreZeroEUm(valor: number) {
  return Number.isFinite(valor) ? Math.max(0, Math.min(1, valor)) : 0;
}

function aguardarRenderizacao() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}
