"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { CheckCircle2, Loader2, ScanFace } from "lucide-react";

import {
  registrarMarcacaoFacialAutorizadaAction,
  type RegistrarMarcacaoFacialActionState,
} from "@/modules/marcacoes-brutas/application/actions/registrar-marcacao-facial.action";
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
  imagemCapturada: string | null;
};

const capturaInicial: CapturaValidacao = {
  template: "[]",
  qualidade: 0,
  metadados: "{}",
  pronta: false,
  tentativa: 0,
  imagemCapturada: null,
};

const registroInicial: RegistrarMarcacaoFacialActionState = {
  erro: null,
  sucesso: null,
  marcacaoId: null,
  tipo: null,
  dataHora: null,
  fusoHorario: null,
  servidorNome: null,
};

export function ValidacaoFacialCard({
  compact = false,
  onRegistroConcluido,
}: {
  compact?: boolean;
  servidorId?: string;
  onRegistroConcluido?: (marcacaoId: string | null) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [estado, formAction, pendente] = useActionState(
    validarFaceMarcacaoAction,
    estadoInicial,
  );
  const [registro, registrarAction, registroPendente] = useActionState(
    registrarMarcacaoFacialAutorizadaAction,
    registroInicial,
  );
  const [captura, setCaptura] = useState<CapturaValidacao>(capturaInicial);
  const [validacaoAutomatica, setValidacaoAutomatica] = useState(false);
  const registroConcluido = Boolean(registro.sucesso && registro.marcacaoId);

  useEffect(() => {
    if (
      !captura.pronta ||
      pendente ||
      !validacaoAutomatica ||
      estado.sucesso ||
      registroPendente ||
      registroConcluido
    ) {
      return;
    }

    formRef.current?.requestSubmit();
  }, [
    captura.pronta,
    estado.sucesso,
    pendente,
    registroConcluido,
    registroPendente,
    validacaoAutomatica,
  ]);

  useEffect(() => {
    if (
      pendente ||
      registroPendente ||
      registroConcluido ||
      !validacaoAutomatica ||
      !estado.mensagem ||
      estado.sucesso
    ) {
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
  }, [
    estado.mensagem,
    estado.sucesso,
    pendente,
    registroConcluido,
    registroPendente,
    validacaoAutomatica,
  ]);

  useEffect(() => {
    if (!registroConcluido) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onRegistroConcluido?.(registro.marcacaoId ?? null);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [onRegistroConcluido, registro.marcacaoId, registroConcluido]);

  const handleCapturaPronta = useCallback(
    (snapshot: FaceSnapshot, imagemCapturada?: string | null) => {
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
        imagemCapturada: imagemCapturada ?? null,
      }));
    },
    [],
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className={compact ? "space-y-4" : "space-y-6"}
    >
      <input type="hidden" name="template" value={captura.template} />
      <input type="hidden" name="qualidade" value={captura.qualidade} />
      <input type="hidden" name="metadados" value={captura.metadados} />

      {registroConcluido ? (
        <ConfirmacaoMarcacaoFacial
          registro={registro}
          imagemCapturada={captura.imagemCapturada}
        />
      ) : null}

      {registro.erro ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <p>{registro.erro}</p>
        </div>
      ) : null}

      {estado.mensagem && !registroConcluido ? (
        <div
          role="status"
          className={`rounded-md border p-4 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <p>{estado.mensagem}</p>

          {typeof estado.distancia === "number" ? (
            <p className="mt-2 text-xs">
              Distância: {estado.distancia.toFixed(4)} | Similaridade:{" "}
              {estado.similaridade?.toFixed(4)}
            </p>
          ) : null}
        </div>
      ) : null}

      {registroConcluido ? null : estado.sucesso &&
        estado.autorizacaoId &&
        estado.autorizacaoToken ? (
        <section className="rounded-md border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          <h2 className="font-bold">Identidade reconhecida</h2>
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
            formAction={registrarAction}
            disabled={registroPendente}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {registroPendente ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {registroPendente
              ? "Registrando marcação..."
              : "Registrar marcação agora"}
          </button>
        </section>
      ) : (
        <ValidacaoFacialAutomatica
          key={captura.tentativa}
          compact={compact}
          bloqueada={pendente || validacaoAutomatica || registroPendente}
          onCapturaPronta={handleCapturaPronta}
        />
      )}
    </form>
  );
}

function ConfirmacaoMarcacaoFacial({
  registro,
  imagemCapturada,
}: {
  registro: RegistrarMarcacaoFacialActionState;
  imagemCapturada?: string | null;
}) {
  const horario = formatarHoraRegistro(registro.dataHora, registro.fusoHorario);
  const tipo = registro.tipo
    ? obterRotuloTipoMarcacaoFacial(registro.tipo)
    : null;

  return (
    <section
      role="status"
      aria-live="polite"
      className="secp-facial-success rounded-xl border border-green-200 bg-green-50/90 px-5 py-8 text-center text-green-950 shadow-sm dark:border-green-900 dark:bg-green-950/75 dark:text-green-100"
    >
      <div className="secp-facial-success-freeze relative mx-auto mb-5 aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border border-green-200 bg-slate-950 shadow-inner dark:border-green-900">
        {imagemCapturada ? (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${imagemCapturada})` }}
            aria-hidden="true"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-green-950 via-slate-950 to-green-900" />
        )}
        <div className="absolute inset-0 bg-green-500/20 mix-blend-screen" />
        <div className="absolute inset-0 ring-4 ring-inset ring-green-400/75" />
      </div>
      <div className="secp-facial-success-icon mx-auto flex size-20 items-center justify-center rounded-full bg-green-700 text-white shadow-lg shadow-green-900/20">
        <CheckCircle2 className="size-11" aria-hidden="true" />
      </div>
      <h2 className="secp-facial-success-text mt-5 text-xl font-black tracking-normal">
        Marcação registrada com sucesso
      </h2>
      {registro.servidorNome ? (
        <p className="secp-facial-success-text mt-2 text-sm font-semibold text-green-900 dark:text-green-100">
          {registro.servidorNome}
        </p>
      ) : null}
      {horario ? (
        <p className="secp-facial-success-text mt-3 text-sm text-green-800 dark:text-green-200">
          {tipo
            ? `${tipo} registrada às ${horario}`
            : `Registrada às ${horario}`}
        </p>
      ) : null}
    </section>
  );
}

function ValidacaoFacialAutomatica({
  compact,
  bloqueada,
  onCapturaPronta,
}: {
  compact: boolean;
  bloqueada: boolean;
  onCapturaPronta: (
    snapshot: FaceSnapshot,
    imagemCapturada?: string | null,
  ) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const capturaEnviadaRef = useRef(false);
  const [status, setStatus] = useState("Preparando câmera...");
  const [faceAprovada, setFaceAprovada] = useState(false);
  const [faceBoxStyle, setFaceBoxStyle] = useState<CSSProperties | null>(null);
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
        const video = videoRef.current;
        const snapshot = await detectar(video);

        if (!ativo || capturaEnviadaRef.current) {
          return;
        }

        const avaliacao = avaliarSnapshotValidacao(snapshot);
        setFaceAprovada(avaliacao.aprovado);
        setFaceBoxStyle(calcularMolduraFace(snapshot, video));
        setStatus(avaliacao.mensagem);

        if (avaliacao.aprovado) {
          capturaEnviadaRef.current = true;
          onCapturaPronta(snapshot, capturarQuadroVideo(video));
          return;
        }
      } catch (error) {
        if (ativo) {
          setFaceAprovada(false);
          setFaceBoxStyle(null);
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
          <div className="pointer-events-none absolute inset-0">
            <div
              style={faceBoxStyle ?? undefined}
              className={`absolute rounded-[32px] border-4 transition-all duration-200 ${
                faceAprovada || bloqueada
                  ? "border-green-400 shadow-[0_0_0_999px_rgba(0,0,0,0.25),0_0_28px_rgba(74,222,128,0.75)]"
                  : "border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]"
              } ${
                faceBoxStyle
                  ? ""
                  : "left-1/2 top-1/2 h-[70%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
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
              {bloqueada ? "Validando reconhecimento facial..." : statusAtual}
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

function capturarQuadroVideo(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight) {
    return null;
  }

  const largura = Math.min(video.videoWidth, 720);
  const altura = Math.round((largura / video.videoWidth) * video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.translate(largura, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, largura, altura);

  return canvas.toDataURL("image/jpeg", 0.82);
}

function calcularMolduraFace(
  snapshot: FaceSnapshot,
  video: HTMLVideoElement,
): CSSProperties | null {
  if (!snapshot.box || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  const [x, y, width, height] = snapshot.box;
  const margemX = width * 0.18;
  const margemY = height * 0.28;
  const left = Math.max(0, x - margemX);
  const top = Math.max(0, y - margemY);
  const framedWidth = Math.min(video.videoWidth - left, width + margemX * 2);
  const framedHeight = Math.min(video.videoHeight - top, height + margemY * 2);

  return {
    left: `${100 - ((left + framedWidth) / video.videoWidth) * 100}%`,
    top: `${(top / video.videoHeight) * 100}%`,
    width: `${(framedWidth / video.videoWidth) * 100}%`,
    height: `${(framedHeight / video.videoHeight) * 100}%`,
  };
}

function formatarHoraRegistro(
  dataHora?: string | null,
  fusoHorario?: string | null,
) {
  if (!dataHora) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fusoHorario ?? "America/Manaus",
  }).format(new Date(dataHora));
}

function obterRotuloTipoMarcacaoFacial(tipo: string) {
  const rotulos: Record<string, string> = {
    ENTRADA: "Entrada",
    SAIDA_INTERVALO: "Saída para intervalo",
    RETORNO_INTERVALO: "Retorno do intervalo",
    SAIDA: "Saída",
    MANUAL: "Manual",
    AJUSTE: "Ajuste",
  };

  return rotulos[tipo] ?? tipo;
}
