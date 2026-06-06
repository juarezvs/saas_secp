"use client";

import { ShieldCheck } from "lucide-react";

import type { DesafioFacial } from "../../../domain/challenge.types";

const ROTULOS: Record<DesafioFacial["tipo"], string> = {
  PISCAR: "Pisque os olhos",
  VIRAR_ESQUERDA: "Vire levemente o rosto para a esquerda",
  VIRAR_DIREITA: "Vire levemente o rosto para a direita",
  OLHAR_CIMA: "Olhe levemente para cima",
  OLHAR_BAIXO: "Olhe levemente para baixo",
  SORRIR: "Sorria levemente",
};

export function LivenessChallengeStep({
  desafio,
  atual,
  total,
}: {
  desafio: DesafioFacial | null;
  atual: number;
  total: number;
}) {
  const progresso = total > 0 ? (atual / total) * 100 : 0;

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-5 text-blue-900 dark:text-blue-300" />
        <div>
          <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
            Prova de vida {Math.min(atual + 1, total)} de {total}
          </p>
          <h2 className="mt-1 text-lg font-bold">
            {desafio ? ROTULOS[desafio.tipo] : "Desafios concluidos"}
          </h2>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--muted)]">
        <div
          className="h-full bg-green-700 transition-all duration-300"
          style={{ width: `${progresso}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        Mantenha o rosto dentro da moldura e realize o movimento com calma.
      </p>
    </section>
  );
}
