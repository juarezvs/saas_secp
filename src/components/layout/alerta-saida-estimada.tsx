"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock3, Volume2, X } from "lucide-react";

type AlertaSaidaPayload = {
  ativo?: boolean;
  servidorNome?: string;
  fusoHorario?: string;
  saidaEstimadaIso?: string;
  saidaEstimada?: string;
  entradaReferencia?: string;
  carga?: string;
  minutosAteAlerta?: number;
  deveAlertarAgora?: boolean;
  mensagem?: string;
  motivo?: string;
};

const STORAGE_PREFIXO = "secp-alerta-saida-estimada";

function chaveAlerta(payload: AlertaSaidaPayload) {
  return `${STORAGE_PREFIXO}:${payload.saidaEstimadaIso ?? "sem-saida"}`;
}

function tocarAvisoSonoro() {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return;

  const contexto = new AudioContextClass();
  const agora = contexto.currentTime;
  const frequencias = [880, 1046, 880];

  frequencias.forEach((frequencia, indice) => {
    const oscilador = contexto.createOscillator();
    const ganho = contexto.createGain();
    const inicio = agora + indice * 0.28;
    const fim = inicio + 0.18;

    oscilador.type = "sine";
    oscilador.frequency.setValueAtTime(frequencia, inicio);
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.22, inicio + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, fim);
    oscilador.connect(ganho);
    ganho.connect(contexto.destination);
    oscilador.start(inicio);
    oscilador.stop(fim + 0.02);
  });

  window.setTimeout(() => void contexto.close(), 1300);
}

export function AlertaSaidaEstimada() {
  const [alerta, setAlerta] = useState<AlertaSaidaPayload | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [audioLiberado, setAudioLiberado] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const carregarAlerta = useCallback(async () => {
    try {
      const response = await fetch("/api/marcacoes/alerta-saida", {
        cache: "no-store",
      });

      if (!response.ok) return null;

      return (await response.json()) as AlertaSaidaPayload;
    } catch {
      return null;
    }
  }, []);

  const disparar = useCallback((payload: AlertaSaidaPayload) => {
    if (!payload.ativo || !payload.saidaEstimadaIso) return;

    const chave = chaveAlerta(payload);
    if (window.sessionStorage.getItem(chave) === "avisado") return;

    window.sessionStorage.setItem(chave, "avisado");
    setAlerta(payload);
    setVisivel(true);

    if (audioLiberado) {
      tocarAvisoSonoro();
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("SECP - saída estimada", {
        body:
          payload.mensagem ??
          "Sua jornada estimada foi cumprida. Verifique o registro de saída.",
      });
    }
  }, [audioLiberado]);

  const sincronizar = useCallback(async () => {
    const payload = await carregarAlerta();

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!payload?.ativo || !payload.saidaEstimadaIso) return;

    const atraso = new Date(payload.saidaEstimadaIso).getTime() - Date.now();

    if (payload.deveAlertarAgora || atraso <= 0) {
      disparar(payload);
      return;
    }

    timeoutRef.current = window.setTimeout(
      () => disparar(payload),
      Math.min(atraso, 2_147_000_000),
    );
  }, [carregarAlerta, disparar]);

  useEffect(() => {
    void sincronizar();
    const intervalo = window.setInterval(() => void sincronizar(), 60_000);

    return () => {
      window.clearInterval(intervalo);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [sincronizar]);

  useEffect(() => {
    function liberarAudio() {
      setAudioLiberado(true);
      window.removeEventListener("click", liberarAudio);
      window.removeEventListener("keydown", liberarAudio);
      window.removeEventListener("touchstart", liberarAudio);
    }

    window.addEventListener("click", liberarAudio, { once: true });
    window.addEventListener("keydown", liberarAudio, { once: true });
    window.addEventListener("touchstart", liberarAudio, { once: true });

    return () => {
      window.removeEventListener("click", liberarAudio);
      window.removeEventListener("keydown", liberarAudio);
      window.removeEventListener("touchstart", liberarAudio);
    };
  }, []);

  if (!visivel || !alerta) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-24 right-4 z-[60] w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 text-amber-950 shadow-2xl shadow-slate-950/25"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-950">
          <Clock3 className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black">Jornada estimada cumprida</p>
              <p className="mt-1 text-sm leading-6">
                {alerta.mensagem ??
                  "Sua jornada estimada foi cumprida. Verifique o registro de saída."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVisivel(false)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-amber-100"
              aria-label="Fechar aviso de saída estimada"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-white px-2.5 py-1">
              Saída estimada: {alerta.saidaEstimada}
            </span>
            {alerta.entradaReferencia ? (
              <span className="rounded-full bg-white px-2.5 py-1">
                Entrada: {alerta.entradaReferencia}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
              <Volume2 className="size-3.5" aria-hidden="true" />
              {audioLiberado ? "Som ativado" : "Som liberado apos interacao"}
            </span>
          </div>

          <Link
            href="/marcacoes/registrar"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#5135f5] px-4 text-sm font-black text-white hover:bg-[#452add]"
          >
            Registrar saída
          </Link>
        </div>
      </div>
    </div>
  );
}

