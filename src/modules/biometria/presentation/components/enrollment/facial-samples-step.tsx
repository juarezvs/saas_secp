"use client";

import { CheckCircle2, Circle } from "lucide-react";

import {
  POSES_AMOSTRA_FACIAL,
  type PoseAmostraFacial,
} from "../../../domain/biometria-facial.types";

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
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
        Amostras faciais
      </p>
      <h2 className="mt-1 text-lg font-bold">
        {poseAtual ? ROTULOS[poseAtual] : "Capturas concluidas"}
      </h2>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        A captura ocorre automaticamente quando a posicao e a qualidade estiverem
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
