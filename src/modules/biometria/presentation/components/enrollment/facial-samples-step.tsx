"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Volume2, VolumeX } from "lucide-react";

import {
  POSES_AMOSTRA_FACIAL,
  type PoseAmostraFacial,
} from "../../../domain/biometria-facial.types";
import { emitirTomSucesso, falar } from "../../utils/audio-feedback";

const ROTULOS: Record<PoseAmostraFacial, string> = {
  FRONTAL: "Olhe de frente",
  ESQUERDA: "Vire para a esquerda",
  DIREITA: "Vire para a direita",
};

export function FacialSamplesStep({
  poseAtual,
  posesCapturadas,
}: {
  poseAtual: PoseAmostraFacial | null;
  posesCapturadas: PoseAmostraFacial[];
}) {
  const [audioAtivo, setAudioAtivo] = useState(true);
  const poseAnunciadaRef = useRef<PoseAmostraFacial | null>(null);
  const totalCapturadoRef = useRef(posesCapturadas.length);
  const proximaFalaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titulo = poseAtual ? ROTULOS[poseAtual] : "Capturas concluídas";

  useEffect(() => {
    if (proximaFalaRef.current) {
      clearTimeout(proximaFalaRef.current);
      proximaFalaRef.current = null;
    }

    if (!audioAtivo) {
      poseAnunciadaRef.current = poseAtual;
      totalCapturadoRef.current = posesCapturadas.length;
      return;
    }

    if (posesCapturadas.length > totalCapturadoRef.current) {
      emitirTomSucesso();
      falar(
        posesCapturadas.length >= POSES_AMOSTRA_FACIAL.length
          ? "Amostras faciais concluídas"
          : "Amostra capturada",
      );
      totalCapturadoRef.current = posesCapturadas.length;
      poseAnunciadaRef.current = poseAtual;
      if (poseAtual && posesCapturadas.length < POSES_AMOSTRA_FACIAL.length) {
        proximaFalaRef.current = setTimeout(() => falar(ROTULOS[poseAtual]), 900);
      }
      return;
    }

    if (poseAtual && poseAnunciadaRef.current !== poseAtual) {
      poseAnunciadaRef.current = poseAtual;
      falar(ROTULOS[poseAtual]);
    }

    totalCapturadoRef.current = posesCapturadas.length;
  }, [audioAtivo, poseAtual, posesCapturadas.length]);

  useEffect(() => {
    return () => {
      if (proximaFalaRef.current) clearTimeout(proximaFalaRef.current);
    };
  }, []);

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
            Amostras faciais
          </p>
          <h2 className="mt-1 text-lg font-bold" aria-live="polite">
            {titulo}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setAudioAtivo((ativo) => !ativo)}
          className="inline-flex size-9 items-center justify-center rounded-md border text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-pressed={audioAtivo}
          aria-label={
            audioAtivo
              ? "Desativar áudio das amostras faciais"
              : "Ativar áudio das amostras faciais"
          }
          title={audioAtivo ? "Áudio ativado" : "Áudio desativado"}
        >
          {audioAtivo ? (
            <Volume2 className="size-4" aria-hidden="true" />
          ) : (
            <VolumeX className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        A captura ocorre automaticamente quando a posição e a qualidade estiverem
        adequadas.
      </p>
      <div className="mt-4 space-y-2">
        {POSES_AMOSTRA_FACIAL.map((pose) => {
          const concluida = posesCapturadas.includes(pose);

          return (
            <div
              key={pose}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                concluida
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
                  : poseAtual === pose
                    ? "border-blue-300 bg-blue-50 font-semibold text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
                    : ""
              }`}
            >
              {concluida ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Circle className="size-4" />
              )}
              {ROTULOS[pose]}
            </div>
          );
        })}
      </div>
    </section>
  );
}
