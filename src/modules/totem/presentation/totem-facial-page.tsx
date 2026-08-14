"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Loader2,
  ScanFace,
  UsersRound,
} from "lucide-react";

import { useCameraStream } from "@/modules/biometria/presentation/hooks/use-camera-stream";
import {
  useFaceDetector,
  type FaceSnapshotMultiplo,
} from "@/modules/biometria/presentation/hooks/use-face-detector";

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

type RostoTotem = {
  id: string;
  label: string;
  detalhe?: string;
  confiavel: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
};

const TOTEM_FACE_CLIENTE_SEGURO = {
  qualidadeMinima: 0.75,
  maxYawGraus: 14,
  maxPitchGraus: 14,
  maxRollGraus: 14,
} as const;

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

function montarRostosDetectados(
  video: HTMLVideoElement,
  faces: FaceSnapshotMultiplo[],
): RostoTotem[] {
  if (!video.videoWidth || !video.videoHeight) {
    return [];
  }

  return faces
    .filter((face) => face.box)
    .map((face) => {
      const [x, y, largura, altura] = face.box!;
      const left = 100 - ((x + largura) / video.videoWidth) * 100;

      return {
        id: face.frameHash,
        label: "Validando",
        detalhe: `${Math.round(face.score * 100)}% qualidade`,
        confiavel:
          face.score >= TOTEM_FACE_CLIENTE_SEGURO.qualidadeMinima &&
          Math.abs(face.yaw) <= TOTEM_FACE_CLIENTE_SEGURO.maxYawGraus &&
          Math.abs(face.pitch) <= TOTEM_FACE_CLIENTE_SEGURO.maxPitchGraus &&
          Math.abs(face.roll) <= TOTEM_FACE_CLIENTE_SEGURO.maxRollGraus,
        left,
        top: (y / video.videoHeight) * 100,
        width: (largura / video.videoWidth) * 100,
        height: (altura / video.videoHeight) * 100,
      };
    });
}

function atualizarRotuloRosto(
  rostos: RostoTotem[],
  id: string,
  dados: Pick<RostoTotem, "label" | "detalhe" | "confiavel">,
) {
  return rostos.map((rosto) =>
    rosto.id === id
      ? {
          ...rosto,
          ...dados,
        }
      : rosto,
  );
}

export function TotemFacialPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const processandoRef = useRef(false);
  const framesProcessadosRef = useRef(new Set<string>());
  const [ativo, setAtivo] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [eventos, setEventos] = useState<EventoTotem[]>([]);
  const [rostos, setRostos] = useState<RostoTotem[]>([]);
  const [status, setStatus] = useState("Câmera desligada.");
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

  useEffect(() => {
    function sincronizarTelaCheia() {
      setTelaCheia(document.fullscreenElement === containerRef.current);
    }

    document.addEventListener("fullscreenchange", sincronizarTelaCheia);

    return () => {
      document.removeEventListener("fullscreenchange", sincronizarTelaCheia);
    };
  }, []);

  async function alternarTelaCheia() {
    if (!containerRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await containerRef.current.requestFullscreen();
    } catch {
      setStatus("Não foi possível alternar o modo tela cheia.");
    }
  }

  async function iniciarTotem() {
    setAtivo(true);
    setStatus("Preparando câmera e reconhecimento facial...");
    try {
      await iniciar();
      await preparar();
      setStatus("Totem ativo. Aguardando servidores diante da câmera.");
    } catch {
      setAtivo(false);
    }
  }

  function desativarTotem() {
    setAtivo(false);
    processandoRef.current = false;
    framesProcessadosRef.current.clear();
    setRostos([]);
    parar();

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("Totem desativado. Câmera desligada.");
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
        setRostos(montarRostosDetectados(videoRef.current, faces));
        const candidatas = faces.filter(
          (face) =>
            face.embedding?.length &&
            face.score >= TOTEM_FACE_CLIENTE_SEGURO.qualidadeMinima &&
            Math.abs(face.yaw) <= TOTEM_FACE_CLIENTE_SEGURO.maxYawGraus &&
            Math.abs(face.pitch) <= TOTEM_FACE_CLIENTE_SEGURO.maxPitchGraus &&
            Math.abs(face.roll) <= TOTEM_FACE_CLIENTE_SEGURO.maxRollGraus &&
            !framesProcessadosRef.current.has(face.frameHash),
        );

        if (candidatas.length === 0) {
          setStatus(
            faces.length > 0
              ? `${faces.length} face(s) detectada(s). Aproxime o rosto, olhe de frente e melhore a iluminação.`
              : "Aguardando face dentro da área da câmera.",
          );
          if (faces.length === 0) {
            setRostos([]);
          }
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
            setRostos((atuais) =>
              atuais.map((rosto) =>
                rosto.id === face.frameHash
                  ? {
                      ...rosto,
                      label: payload.servidor?.nome ?? "Já registrado",
                      detalhe: "Registro recente",
                      confiavel: true,
                    }
                  : rosto,
              ),
            );
            continue;
          }

          if (payload.erro) {
            setStatus(payload.erro);
            setRostos((atuais) =>
              atualizarRotuloRosto(atuais, face.frameHash, {
                label: "Não registrado",
                detalhe: payload.erro,
                confiavel: false,
              }),
            );
            continue;
          }

          if (!payload.reconhecido || !servidor) {
            if (payload.mensagem) {
              setStatus(payload.mensagem);
            }
            setRostos((atuais) =>
              atualizarRotuloRosto(atuais, face.frameHash, {
                label: "Não confirmado",
                detalhe: payload.mensagem ?? "Reconhecimento inseguro",
                confiavel: false,
              }),
            );
            continue;
          }

          setRostos((atuais) =>
            atualizarRotuloRosto(atuais, face.frameHash, {
              label: servidor.nome,
              detalhe: `${servidor.matricula} - ${
                typeof payload.similaridade === "number"
                  ? `${(payload.similaridade * 100).toFixed(1)}%`
                  : "validado"
              }`,
              confiavel: true,
            }),
          );

          adicionarEvento({
            id: `${Date.now()}-${face.indice}-${Math.random()}`,
            nome: servidor.nome,
            matricula: servidor.matricula,
            mensagem: payload.mensagem ?? "Marcação registrada.",
            horario: formatarHora(),
            similaridade: payload.similaridade,
          });
        }
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Não foi possível processar o reconhecimento.",
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
  const containerClassName = telaCheia
    ? "m-0 flex h-screen min-h-screen overflow-hidden bg-slate-950 p-4 text-slate-950 md:p-5"
    : "-m-6 min-h-[calc(100vh-4rem)] bg-slate-100 px-4 py-6 text-slate-950 md:px-6";
  const conteudoClassName = telaCheia
    ? "flex h-full w-full flex-col"
    : "mx-auto w-full max-w-7xl";
  const headerClassName = telaCheia
    ? "mb-4 flex shrink-0 flex-col gap-3 text-white md:flex-row md:items-end md:justify-between"
    : "mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between";
  const mainClassName = telaCheia
    ? "grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]"
    : "grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]";
  const cameraSectionClassName = telaCheia
    ? "flex min-h-0 flex-col rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6";
  const videoFrameClassName = telaCheia
    ? "relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black"
    : "relative overflow-hidden rounded-2xl bg-black";
  const videoClassName = telaCheia
    ? "h-full w-full scale-x-[-1] object-cover"
    : "aspect-video w-full scale-x-[-1] object-cover";
  const feedSectionClassName = telaCheia
    ? "flex min-h-0 flex-col rounded-2xl border border-slate-700 bg-white p-4 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6";
  const feedListaClassName = telaCheia
    ? "mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
    : "mt-4 space-y-3";

  return (
    <div ref={containerRef} className={containerClassName}>
      <div className={conteudoClassName}>
        <header className={headerClassName}>
          <div>
            <h1 className="text-2xl font-black tracking-normal md:text-3xl">
              Modo Totem
            </h1>
            <p
              className={`mt-1 text-sm ${
                telaCheia ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Registro facial coletivo com reconhecimento contínuo e bloqueio
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

        <main className={mainClassName}>
          <section className={cameraSectionClassName}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[#5135f5]/10 p-2 text-[#5135f5]">
                  <UsersRound className="size-5" />
                </div>
                <div>
                  <h2
                    className={`text-lg font-black ${
                      telaCheia ? "text-white" : ""
                    }`}
                  >
                    Câmera do Totem
                  </h2>
                  <p
                    className={`mt-1 text-sm ${
                      telaCheia ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    A câmera pode reconhecer mais de uma pessoa no mesmo frame.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={alternarTelaCheia}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  {telaCheia ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                  {telaCheia ? "Sair da tela cheia" : "Tela cheia"}
                </button>
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
            </div>

            <div className={videoFrameClassName}>
              <video
                ref={videoRef}
                muted
                playsInline
                className={videoClassName}
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.42)_72%)]" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[66%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-4 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.15)]" />
              <div className="pointer-events-none absolute inset-0">
                {rostos.map((rosto) => (
                  <div
                    key={rosto.id}
                    className={`absolute rounded-2xl border-4 shadow-[0_0_22px_rgba(0,0,0,0.45)] ${
                      rosto.confiavel
                        ? "border-emerald-400"
                        : "border-amber-300"
                    }`}
                    style={{
                      left: `${rosto.left}%`,
                      top: `${rosto.top}%`,
                      width: `${rosto.width}%`,
                      height: `${rosto.height}%`,
                    }}
                  >
                    <div
                      className={`absolute left-1 top-1 max-w-[calc(100%-0.5rem)] rounded-lg px-3 py-1.5 text-xs font-black text-white shadow-lg ${
                        rosto.confiavel ? "bg-emerald-600" : "bg-amber-600"
                      }`}
                    >
                      <div className="truncate">{rosto.label}</div>
                      {rosto.detalhe ? (
                        <div className="truncate text-[10px] font-semibold opacity-90">
                          {rosto.detalhe}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
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

          <section className={feedSectionClassName}>
            <h2 className="text-lg font-black">Ao vivo - últimas marcações</h2>
            <div className={feedListaClassName}>
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
                            {evento.matricula ?? "Sem matrícula"}
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
                  diante da câmera.
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
