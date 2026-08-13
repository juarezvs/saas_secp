"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  ScanFace,
  UsersRound,
} from "lucide-react";

import { useCameraStream } from "@/modules/biometria/presentation/hooks/use-camera-stream";
import { useFaceDetector } from "@/modules/biometria/presentation/hooks/use-face-detector";

type EventoTotem = {
  id: string;
  nome: string;
  matricula?: string | null;
  mensagem: string;
  horario: string;
  similaridade?: number | null;
};

type RespostaTotem = {
  reconhecido?: boolean;
  duplicado?: boolean;
  erro?: string;
  mensagem?: string;
  servidor?: {
    id?: string;
    nome: string;
    matricula: string;
    orgao?: string | null;
  };
  similaridade?: number;
};

function capturarQuadro(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight) return null;

  const largura = Math.min(video.videoWidth, 420);
  const altura = Math.round((largura / video.videoWidth) * video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const context = canvas.getContext("2d");

  if (!context) return null;

  context.drawImage(video, 0, 0, largura, altura);
  return canvas.toDataURL("image/jpeg", 0.62);
}

function formatarHora(data = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(data);
}

export function TotemFacialPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const processandoRef = useRef(false);
  const framesProcessadosRef = useRef(new Set<string>());
  const [ativo, setAtivo] = useState(false);
  const [eventos, setEventos] = useState<EventoTotem[]>([]);
  const [status, setStatus] = useState("Camera desligada.");
  const {
    stream,
    carregando: cameraCarregando,
    erro: cameraErro,
    iniciar,
    parar,
  } = useCameraStream();
  const {
    pronto,
    carregando: detectorCarregando,
    erro: detectorErro,
    preparar,
    detectarMultiplas,
  } = useFaceDetector();

  useEffect(() => {
    if (!stream || !videoRef.current) return;

    videoRef.current.srcObject = stream;
    void videoRef.current.play();
  }, [stream]);

  async function iniciarTotem() {
    setAtivo(true);
    setStatus("Preparando camera e reconhecimento facial...");
    try {
      await iniciar();
      await preparar();
      setStatus("Totem ativo. Aguardando servidores diante da camera.");
    } catch {
      setAtivo(false);
    }
  }

  function desativarTotem() {
    setAtivo(false);
    processandoRef.current = false;
    framesProcessadosRef.current.clear();
    parar();

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("Totem desativado. Camera desligada.");
  }

  function alternarTotem() {
    if (ativo) {
      desativarTotem();
      return;
    }

    void iniciarTotem();
  }

  function adicionarEvento(evento: EventoTotem) {
    setEventos((atuais) => [evento, ...atuais].slice(0, 18));
  }

  useEffect(() => {
    if (!ativo || !pronto || !stream) return;

    let cancelado = false;
    let timer: number | null = null;

    async function processarFrame() {
      if (
        cancelado ||
        processandoRef.current ||
        !videoRef.current ||
        videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        timer = window.setTimeout(processarFrame, 900);
        return;
      }

      processandoRef.current = true;

      try {
        const faces = await detectarMultiplas(videoRef.current);
        const candidatas = faces.filter(
          (face) =>
            face.embedding?.length &&
            face.score >= 0.55 &&
            !framesProcessadosRef.current.has(face.frameHash),
        );

        if (candidatas.length === 0) {
          setStatus(
            faces.length > 0
              ? `${faces.length} face(s) detectada(s). Ajuste enquadramento.`
              : "Aguardando face dentro da area da camera.",
          );
          return;
        }

        setStatus(`${candidatas.length} reconhecimento(s) em processamento...`);
        const imagem = capturarQuadro(videoRef.current);

        for (const face of candidatas) {
          framesProcessadosRef.current.add(face.frameHash);
          const response = await fetch("/api/totem/reconhecer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              template: face.embedding,
              qualidade: face.score,
              imagem,
              metadados: {
                facesNoFrame: face.faces,
                indiceFace: face.indice,
                yaw: face.yaw,
                pitch: face.pitch,
                roll: face.roll,
                frameHash: face.frameHash,
              },
            }),
          });
          const payload = (await response.json()) as RespostaTotem;
          const servidor = payload.servidor;

          if (payload.duplicado) {
            continue;
          }

          if (payload.erro) {
            setStatus(payload.erro);
            continue;
          }

          if (!payload.reconhecido || !servidor) {
            continue;
          }

          adicionarEvento({
            id: `${Date.now()}-${face.indice}-${Math.random()}`,
            nome: servidor.nome,
            matricula: servidor.matricula,
            mensagem: payload.mensagem ?? "Marcacao registrada.",
            horario: formatarHora(),
            similaridade: payload.similaridade,
          });
        }
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Nao foi possivel processar o reconhecimento.",
        );
      } finally {
        processandoRef.current = false;
        timer = window.setTimeout(processarFrame, 1100);
      }
    }

    timer = window.setTimeout(processarFrame, 500);

    return () => {
      cancelado = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [ativo, detectarMultiplas, pronto, stream]);

  const erro = cameraErro ?? detectorErro;
  const carregando = cameraCarregando || detectorCarregando;
  const totalRegistrado = eventos.length;

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-slate-100 px-4 py-6 text-slate-950 md:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-normal md:text-3xl">
              Modo Totem
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Registro facial coletivo com reconhecimento continuo e bloqueio
              anti-duplicidade.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <IndicadorTotem
              label="Status"
              valor={ativo ? "Online" : "Parado"}
            />
            <IndicadorTotem
              label="Registrados"
              valor={String(totalRegistrado)}
            />
            <IndicadorTotem
              label="Motor"
              valor={pronto ? "Pronto" : "Carregando"}
            />
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[#5135f5]/10 p-2 text-[#5135f5]">
                  <UsersRound className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black">Camera do Totem</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    A camera pode reconhecer mais de uma pessoa no mesmo frame.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={alternarTotem}
                disabled={carregando}
                className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
                  ativo
                    ? "bg-red-600 shadow-red-600/20 hover:bg-red-700"
                    : "bg-[#5135f5] shadow-[#5135f5]/20 hover:bg-[#452add]"
                }`}
              >
                {carregando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                {ativo ? "Desativar Totem" : "Ativar Totem"}
              </button>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                muted
                playsInline
                className="aspect-video w-full scale-x-[-1] object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.42)_72%)]" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[66%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-4 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.15)]" />
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/72 px-4 py-3 text-sm font-bold text-white">
                <span className="inline-flex items-center gap-2">
                  {carregando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ScanFace className="size-4" />
                  )}
                  {erro ?? status}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-950">
                  Multi-face
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Registro por reconhecimento facial</span>
              <span className="text-slate-400">-</span>
              <span>Janela anti-duplicidade de 10 minutos</span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-black">Ao vivo - ultimas marcacoes</h2>
            <div className="mt-4 space-y-3">
              {eventos.map((evento) => (
                <div
                  key={evento.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black">{evento.nome}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {evento.matricula ?? "Sem matricula"}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-slate-500">
                          {evento.horario}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {evento.mensagem}
                      </p>
                      {typeof evento.similaridade === "number" ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Similaridade: {(evento.similaridade * 100).toFixed(1)}
                          %
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {eventos.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-10 text-center text-sm leading-6 text-slate-500">
                  Nenhum registro ainda. Ative o Totem e posicione as pessoas
                  diante da camera.
                </div>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function IndicadorTotem({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-black">{valor}</p>
    </div>
  );
}
