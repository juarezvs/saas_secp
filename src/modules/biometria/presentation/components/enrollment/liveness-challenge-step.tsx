"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Volume2, VolumeX } from "lucide-react";

import type { DesafioFacial } from "../../../domain/challenge.types";
import { emitirTomSucesso, falar } from "../../utils/audio-feedback";

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
  const [audioAtivo, setAudioAtivo] = useState(true);
  const ultimoDesafioAnunciadoRef = useRef<string | null>(null);
  const etapasConcluidasRef = useRef(atual);
  const proximaFalaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progresso = total > 0 ? (atual / total) * 100 : 0;
  const instrucaoAtual = desafio ? ROTULOS[desafio.tipo] : "Desafios concluídos";

  useEffect(() => {
    if (proximaFalaRef.current) {
      clearTimeout(proximaFalaRef.current);
      proximaFalaRef.current = null;
    }

    if (!audioAtivo) {
      etapasConcluidasRef.current = atual;
      ultimoDesafioAnunciadoRef.current = desafio?.id ?? null;
      return;
    }

    if (atual > etapasConcluidasRef.current) {
      emitirTomSucesso();

      if (atual >= total) {
        falar("Prova de vida concluída");
      } else {
        falar("Etapa concluída");
        proximaFalaRef.current = setTimeout(() => {
          if (desafio) falar(instrucaoAtual);
        }, 900);
      }

      etapasConcluidasRef.current = atual;
      ultimoDesafioAnunciadoRef.current = desafio?.id ?? null;
      return;
    }

    if (desafio && ultimoDesafioAnunciadoRef.current !== desafio.id) {
      ultimoDesafioAnunciadoRef.current = desafio.id;
      falar(instrucaoAtual);
    }

    etapasConcluidasRef.current = atual;
  }, [audioAtivo, atual, desafio, instrucaoAtual, total]);

  useEffect(() => {
    return () => {
      if (proximaFalaRef.current) clearTimeout(proximaFalaRef.current);
    };
  }, []);

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-blue-900 dark:text-blue-300" />
          <div>
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Prova de vida {Math.min(atual + 1, total)} de {total}
            </p>
            <h2 className="mt-1 text-lg font-bold" aria-live="polite">
              {instrucaoAtual}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAudioAtivo((ativo) => !ativo)}
          className="inline-flex size-9 items-center justify-center rounded-md border text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-pressed={audioAtivo}
          aria-label={
            audioAtivo
              ? "Desativar áudio da prova de vida"
              : "Ativar áudio da prova de vida"
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
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--muted)]">
        <div
          className="h-full bg-green-700 transition-all duration-300"
          style={{ width: `${progresso}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        Mantenha o rosto dentro da moldura e realize o movimento com calma.
      </p>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        O áudio informa a etapa atual e confirma quando o movimento é aceito.
      </p>
    </section>
  );
}
