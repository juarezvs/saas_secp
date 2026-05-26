"use client";

import { useEffect, useState } from "react";
import { ALargeSmall, BookOpenText, Moon, Sun } from "lucide-react";

type Tema = "light" | "dark";
type TamanhoFonte = "normal" | "large" | "xlarge";

const STORAGE_TEMA = "secp-tema";
const STORAGE_TAMANHO_FONTE = "secp-tamanho-fonte";
const STORAGE_FONTE_DISLEXIA = "secp-fonte-dislexia";

function obterTemaInicial(): Tema {
  if (typeof window === "undefined") return "light";

  const temaSalvo = localStorage.getItem(STORAGE_TEMA);

  if (temaSalvo === "dark" || temaSalvo === "light") {
    return temaSalvo;
  }

  return "light";
}

function obterTamanhoFonteInicial(): TamanhoFonte {
  if (typeof window === "undefined") return "normal";

  const tamanhoSalvo = localStorage.getItem(STORAGE_TAMANHO_FONTE);

  if (
    tamanhoSalvo === "normal" ||
    tamanhoSalvo === "large" ||
    tamanhoSalvo === "xlarge"
  ) {
    return tamanhoSalvo;
  }

  return "normal";
}

function obterFonteDislexiaInicial(): boolean {
  if (typeof window === "undefined") return false;

  return localStorage.getItem(STORAGE_FONTE_DISLEXIA) === "true";
}

function aplicarTema(tema: Tema) {
  const root = document.documentElement;

  if (tema === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  localStorage.setItem(STORAGE_TEMA, tema);
}

function aplicarTamanhoFonte(tamanho: TamanhoFonte) {
  document.body.dataset.fontSize = tamanho;
  localStorage.setItem(STORAGE_TAMANHO_FONTE, tamanho);
}

function aplicarFonteDislexia(ativo: boolean) {
  document.body.dataset.dyslexiaFont = String(ativo);
  localStorage.setItem(STORAGE_FONTE_DISLEXIA, String(ativo));
}

export function AccessibilityToolbar() {
  const [tema, setTema] = useState<Tema>(() => obterTemaInicial());

  const [tamanhoFonte, setTamanhoFonte] = useState<TamanhoFonte>(() =>
    obterTamanhoFonteInicial(),
  );

  const [fonteDislexia, setFonteDislexia] = useState<boolean>(() =>
    obterFonteDislexiaInicial(),
  );

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  useEffect(() => {
    aplicarTamanhoFonte(tamanhoFonte);
  }, [tamanhoFonte]);

  useEffect(() => {
    aplicarFonteDislexia(fonteDislexia);
  }, [fonteDislexia]);

  function alternarTema() {
    setTema((temaAtual) => (temaAtual === "dark" ? "light" : "dark"));
  }

  function alternarTamanhoFonte() {
    setTamanhoFonte((tamanhoAtual) => {
      if (tamanhoAtual === "normal") return "large";
      if (tamanhoAtual === "large") return "xlarge";

      return "normal";
    });
  }

  function alternarFonteDislexia() {
    setFonteDislexia((ativoAtual) => !ativoAtual);
  }

  return (
    <div
      className="flex items-center gap-2"
      aria-label="Ferramentas de acessibilidade"
    >
      <button
        type="button"
        onClick={alternarTema}
        className="inline-flex size-10 items-center justify-center rounded-lg border bg-(--card) text-(--foreground) transition hover:bg-(--muted)"
        aria-label={
          tema === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
        }
        title={tema === "dark" ? "Tema claro" : "Tema escuro"}
        aria-pressed={tema === "dark"}
      >
        {tema === "dark" ? (
          <Sun className="size-5" aria-hidden="true" />
        ) : (
          <Moon className="size-5" aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={alternarTamanhoFonte}
        className="inline-flex size-10 items-center justify-center rounded-lg border bg-(--card) text-(--foreground) transition hover:bg-(--muted)"
        aria-label={`Alternar tamanho da fonte. Tamanho atual: ${tamanhoFonte}`}
        title={`Tamanho da fonte: ${tamanhoFonte}`}
        aria-pressed={tamanhoFonte !== "normal"}
      >
        <ALargeSmall className="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={alternarFonteDislexia}
        className="inline-flex size-10 items-center justify-center rounded-lg border bg-(--card) text-(--foreground) transition hover:bg-(--muted)"
        aria-label={
          fonteDislexia
            ? "Desativar ajustes para dislexia"
            : "Ativar ajustes para dislexia"
        }
        title="Fonte para dislexia"
        aria-pressed={fonteDislexia}
      >
        <BookOpenText className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
