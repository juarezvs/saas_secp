"use client";

import { useEffect, useState } from "react";
import { ALargeSmall, BookOpenText, Moon, Sun } from "lucide-react";

type Tema = "light" | "dark";
type TamanhoFonte = "normal" | "large" | "xlarge";

const STORAGE_TEMA = "secp-tema";
const STORAGE_TAMANHO_FONTE = "secp-tamanho-fonte";
const STORAGE_FONTE_DISLEXIA = "secp-fonte-dislexia";

function normalizarTema(valor: string | null): Tema {
  return valor === "dark" || valor === "light" ? valor : "light";
}

function normalizarTamanhoFonte(valor: string | null): TamanhoFonte {
  if (valor === "normal" || valor === "large" || valor === "xlarge") {
    return valor;
  }

  return "normal";
}

function lerTemaInicial(): Tema {
  if (typeof window === "undefined") {
    return "light";
  }

  return normalizarTema(window.localStorage.getItem(STORAGE_TEMA));
}

function lerTamanhoFonteInicial(): TamanhoFonte {
  if (typeof window === "undefined") {
    return "normal";
  }

  return normalizarTamanhoFonte(
    window.localStorage.getItem(STORAGE_TAMANHO_FONTE),
  );
}

function lerFonteDislexiaInicial(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(STORAGE_FONTE_DISLEXIA) === "true";
}

function aplicarTema(tema: Tema) {
  const root = document.documentElement;

  if (tema === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  window.localStorage.setItem(STORAGE_TEMA, tema);
}

function aplicarTamanhoFonte(tamanho: TamanhoFonte) {
  document.body.dataset.fontSize = tamanho;
  window.localStorage.setItem(STORAGE_TAMANHO_FONTE, tamanho);
}

function aplicarFonteDislexia(ativo: boolean) {
  document.body.dataset.dyslexiaFont = String(ativo);
  window.localStorage.setItem(STORAGE_FONTE_DISLEXIA, String(ativo));
}

function obterClasseBotao(ativo: boolean) {
  return `inline-flex size-10 items-center justify-center rounded-lg border transition ${
    ativo
      ? "border-blue-700 bg-blue-900 text-white"
      : "bg-(--card) text-(--foreground) hover:bg-(--muted)"
  }`;
}

export function AccessibilityToolbar() {
  const [tema, setTema] = useState<Tema>(lerTemaInicial);
  const [tamanhoFonte, setTamanhoFonte] = useState<TamanhoFonte>(
    lerTamanhoFonteInicial,
  );
  const [fonteDislexia, setFonteDislexia] = useState<boolean>(
    lerFonteDislexiaInicial,
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
      if (tamanhoAtual === "normal") {
        return "large";
      }

      if (tamanhoAtual === "large") {
        return "xlarge";
      }

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
        className={obterClasseBotao(tema === "dark")}
        aria-label={
          tema === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
        }
        title={tema === "dark" ? "Tema claro" : "Tema escuro"}
        aria-pressed={tema === "dark"}
        suppressHydrationWarning
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
        className={obterClasseBotao(tamanhoFonte !== "normal")}
        aria-label={`Alternar tamanho da fonte. Tamanho atual: ${tamanhoFonte}`}
        title={`Tamanho da fonte: ${tamanhoFonte}`}
        aria-pressed={tamanhoFonte !== "normal"}
        suppressHydrationWarning
      >
        <ALargeSmall className="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={alternarFonteDislexia}
        className={obterClasseBotao(fonteDislexia)}
        aria-label={
          fonteDislexia
            ? "Desativar ajustes para dislexia"
            : "Ativar ajustes para dislexia"
        }
        title="Fonte para dislexia"
        aria-pressed={fonteDislexia}
        suppressHydrationWarning
      >
        <BookOpenText className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
