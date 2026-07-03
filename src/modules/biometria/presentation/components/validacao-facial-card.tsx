"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Loader2, ScanFace } from "lucide-react";

import { registrarMarcacaoFacialAutorizadaAction } from "@/modules/marcacoes-brutas/application/actions/registrar-marcacao-facial.action";
import { validarFaceMarcacaoAction } from "../../application/actions/validar-face-marcacao.action";
import { avaliarPoseParaEtapa } from "../../application/services/biometria-facial-config";
import type { BiometriaFormState } from "../../application/schemas/biometria.schema";
import { useCameraStream } from "../hooks/use-camera-stream";
import { useFaceDetector, type FaceSnapshot } from "../hooks/use-face-detector";

const estadoInicial: BiometriaFormState = {
  sucesso: false,
  mensagem: null,
};

type CapturaValidacao = {
  template: string;
  qualidade: number;
  metadados: string;
  pronta: boolean;
  tentativa: number;
};

const capturaInicial: CapturaValidacao = {
  template: "[]",
  qualidade: 0,
  metadados: "{}",
  pronta: false,
  tentativa: 0,
};

export function ValidacaoFacialCard({
  compact = false,
}: {
  compact?: boolean;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [estado, formAction, pendente] = useActionState(
    validarFaceMarcacaoAction,
    estadoInicial,
  );
  const [captura, setCaptura] = useState<CapturaValidacao>(capturaInicial);
  const [validacaoAutomatica, setValidacaoAutomatica] = useState(false);

  useEffect(() => {
    if (
      !captura.pronta ||
      pendente ||
      !validacaoAutomatica ||
      estado.sucesso
    ) {
      return;
    }

    formRef.current?.requestSubmit();
  }, [captura.pronta, estado.sucesso, pendente, validacaoAutomatica]);

  useEffect(() => {
    if (pendente || !validacaoAutomatica || !estado.mensagem || estado.sucesso) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCaptura((atual) => ({
        ...capturaInicial,
        tentativa: atual.tentativa + 1,
      }));
      setValidacaoAutomatica(false);
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [estado.mensagem, estado.sucesso, pendente, validacaoAutomatica]);

  const handleCapturaPronta = useCallback((snapshot: FaceSnapshot) => {
    if (!snapshot.embedding?.length) {
      return;
    }

    setValidacaoAutomatica(true);
    setCaptura((atual) => ({
      template: JSON.stringify(snapshot.embedding),
      qualidade: snapshot.score,
      metadados: JSON.stringify({
        origem: "VALIDACAO_WEB",
        pose: "FRONTAL",
        yaw: snapshot.yaw,
        pitch: snapshot.pitch,
        roll: snapshot.roll,
        frameHash: snapshot.frameHash,
        faces: snapshot.faces,
      }),
      pronta: true,
      tentativa: atual.tentativa,
    }));
  }, []);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={compact ? "space-y-4" : "space-y-6"}
    >
      <input type="hidden" name="template" value={captura.template} />
      <input type="hidden" name="qualidade" value={captura.qualidade} />
      <input type="hidden" name="metadados" value={captura.metadados} />

      {estado.mensagem && (
        <div
          role="status"
          className={`rounded-md border p-4 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <p>{estado.mensagem}</p>

          {typeof estado.distancia === "number" && (
            <p className="mt-2 text-xs">
              Distância: {estado.distancia.toFixed(4)} | Similaridade:{" "}
              {estado.similaridade?.toFixed(4)}
            </p>
          )}
        </div>
      )}

      {estado.sucesso && estado.autorizacaoId && estado.autorizacaoToken ? (
        <section className="rounded-md border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          <h2 className="font-bold">Identidade confirmada</h2>
          <p className="mt-2 text-sm leading-6">
            A validação facial foi concluída. Confirme para gravar a marcação
            com data e hora atuais.
          </p>

          <input
            type="hidden"
            name="autorizacaoBiometricaId"
            value={estado.autorizacaoId}
          />
          <input
            type="hidden"
            name="autorizacaoBiometricaToken"
            value={estado.autorizacaoToken}
          />

          <button
            type="submit"
            formAction={registrarMarcacaoFacialAutorizadaAction}
            className="mt-4 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            Registrar marcação agora
          </button>
        </section>
      ) : (
        <ValidacaoFacialAutomatica
          key={captura.tentativa}
          compact={compact}
          bloqueada={pendente || validacaoAutomatica}
          onCapturaPronta={handleCapturaPronta}
        />
      )}
    </form>
  );
}

function ValidacaoFacialAutomatica({
  compact,
  bloqueada,
  onCapturaPronta,
}: {
  compact: boolean;
  bloqueada: boolean;
  onCapturaPronta: (snapshot: FaceSnapshot) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const capturaEnviadaRef = useRef(false);
  const [status, setStatus] = useState("Preparando câmera...");
  const [faceAprovada, setFaceAprovada] = useState(false);
  const {
    stream,
    carregando: cameraCarregando,
    erro: cameraErro,
    iniciar: iniciarCamera,
  } = useCameraStream();
  const {
    pronto: detectorPronto,
    carregando: detectorCarregando,
    erro: detectorErro,
    preparar: prepararDetector,
    detectar,
  } = useFaceDetector();

  useEffect(() => {
    let ativo = true;

    async function preparar() {
      try {
        await iniciarCamera();
        if (!ativo) return;
        setStatus("Carregando reconhecimento facial...");
        await prepararDetector();
        if (!ativo) return;
        setStatus("Posicione o rosto dentro da moldura.");
      } catch (error) {
        if (!ativo) return;
        setStatus(
          error instanceof Error
            ? error.message
            : "Não foi possível preparar a validação facial.",
        );
      }
    }

    void preparar();

    return () => {
      ativo = false;
    };
  }, [iniciarCamera, prepararDetector]);

  useEffect(() => {
    if (!videoRef.current || !stream) {
      return;
    }

    const video = videoRef.current;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const reproduzir = () => {
      void video.play().catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setStatus(
          "A câmera foi liberada, mas o navegador bloqueou a exibição do vídeo.",
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

  useEffect(() => {
    if (!detectorPronto || !stream || bloqueada) {
      return;
    }

    let ativo = true;
    let timeout: number | null = null;

    async function validarFrame() {
      if (!ativo || !videoRef.current || capturaEnviadaRef.current) {
        return;
      }

      try {
        const snapshot = await detectar(videoRef.current);

        if (!ativo || capturaEnviadaRef.current) {
          return;
        }

        const avaliacao = avaliarSnapshotValidacao(snapshot);
        setFaceAprovada(avaliacao.aprovado);
        setStatus(avaliacao.mensagem);

        if (avaliacao.aprovado) {
          capturaEnviadaRef.current = true;
          onCapturaPronta(snapshot);
          return;
        }
      } catch (error) {
        if (ativo) {
          setFaceAprovada(false);
          setStatus(
            error instanceof Error
              ? error.message
              : "Não foi possível processar a validação facial.",
          );
        }
      }

      timeout = window.setTimeout(validarFrame, 650);
    }

    timeout = window.setTimeout(validarFrame, 250);

    return () => {
      ativo = false;
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [bloqueada, detectar, detectorPronto, onCapturaPronta, stream]);

  const carregando = cameraCarregando || detectorCarregando || bloqueada;
  const erro = cameraErro ?? detectorErro;
  const statusAtual = erro ?? status;

  return (
    <section
      className={
        compact
          ? "space-y-3"
          : "rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
      }
    >
      <div>
        <h2 className={compact ? "font-semibold" : "text-lg font-bold"}>
          Validação facial
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Posicione o rosto dentro da moldura. A validação começa
          automaticamente quando a face estiver nítida e frontal.
        </p>
      </div>

      <div
        className={compact ? "flex justify-center" : "mt-5 flex justify-center"}
      >
        <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border bg-black shadow-sm">
          <video
            ref={videoRef}
            muted
            playsInline
            className="aspect-[4/3] w-full scale-x-[-1] object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`h-[70%] w-[48%] rounded-[50%] border-4 transition-colors ${
                faceAprovada || bloqueada
                  ? "border-green-400 shadow-[0_0_0_999px_rgba(0,0,0,0.25),0_0_28px_rgba(74,222,128,0.75)]"
                  : "border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]"
              }`}
            />
          </div>

          <div className="absolute inset-x-3 bottom-3 rounded-md bg-black/75 px-3 py-2 text-center text-sm font-semibold text-white">
            <span className="inline-flex items-center justify-center gap-2">
              {carregando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : faceAprovada ? (
                <CheckCircle2
                  className="size-4 text-green-300"
                  aria-hidden="true"
                />
              ) : (
                <ScanFace className="size-4" aria-hidden="true" />
              )}
              {bloqueada ? "Validando identidade..." : statusAtual}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function avaliarSnapshotValidacao(snapshot: FaceSnapshot) {
  if (snapshot.faces === 0) {
    return {
      aprovado: false,
      mensagem: "Aguardando detecção da face.",
    };
  }

  if (snapshot.faces > 1) {
    return {
      aprovado: false,
      mensagem: "Mantenha apenas uma pessoa diante da câmera.",
    };
  }

  if (!snapshot.embedding?.length) {
    return {
      aprovado: false,
      mensagem: "Ajuste o enquadramento para capturar o template facial.",
    };
  }

  const avaliacao = avaliarPoseParaEtapa({
    etapa: "FRONTAL",
    score: snapshot.score,
    angulos: {
      yaw: snapshot.yaw,
      pitch: snapshot.pitch,
      roll: snapshot.roll,
    },
  });

  if (!avaliacao.aprovado) {
    return {
      aprovado: false,
      mensagem: avaliacao.mensagem,
    };
  }

  return {
    aprovado: true,
    mensagem: "Face detectada. Validando identidade...",
  };
}
