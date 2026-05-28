"use client";

import { useEffect, useState } from "react";
import { ALargeSmall, BookOpenText, Moon, Sun } from "lucide-react";

type Tema = "light" | "dark";
type TamanhoFonte = "normal" | "large" | "xlarge";

const STORAGE_TEMA = "secp-tema";
const STORAGE_TAMANHO_FONTE = "secp-tamanho-fonte";
const STORAGE_FONTE_DISLEXIA = "secp-fonte-dislexia";

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

function normalizarTema(valor: string | null): Tema {
  return valor === "dark" || valor === "light" ? valor : "light";
}

function normalizarTamanhoFonte(valor: string | null): TamanhoFonte {
  if (valor === "normal" || valor === "large" || valor === "xlarge") {
    return valor;
  }

  return "normal";
}

export function AccessibilityToolbar() {
  const [montado, setMontado] = useState(false);
  const [tema, setTema] = useState<Tema>("light");
  const [tamanhoFonte, setTamanhoFonte] = useState<TamanhoFonte>("normal");
  const [fonteDislexia, setFonteDislexia] = useState(false);

  useEffect(() => {
    const temaInicial = normalizarTema(
      window.localStorage.getItem(STORAGE_TEMA),
    );

    const tamanhoFonteInicial = normalizarTamanhoFonte(
      window.localStorage.getItem(STORAGE_TAMANHO_FONTE),
    );

    const fonteDislexiaInicial =
      window.localStorage.getItem(STORAGE_FONTE_DISLEXIA) === "true";

    setTema(temaInicial);
    setTamanhoFonte(tamanhoFonteInicial);
    setFonteDislexia(fonteDislexiaInicial);

    aplicarTema(temaInicial);
    aplicarTamanhoFonte(tamanhoFonteInicial);
    aplicarFonteDislexia(fonteDislexiaInicial);

    setMontado(true);
  }, []);

  function alternarTema() {
    setTema((temaAtual) => {
      const novoTema = temaAtual === "dark" ? "light" : "dark";
      aplicarTema(novoTema);
      return novoTema;
    });
  }

  function alternarTamanhoFonte() {
    setTamanhoFonte((tamanhoAtual) => {
      const novoTamanho =
        tamanhoAtual === "normal"
          ? "large"
          : tamanhoAtual === "large"
            ? "xlarge"
            : "normal";

      aplicarTamanhoFonte(novoTamanho);
      return novoTamanho;
    });
  }

  function alternarFonteDislexia() {
    setFonteDislexia((ativoAtual) => {
      const novoValor = !ativoAtual;
      aplicarFonteDislexia(novoValor);
      return novoValor;
    });
  }

  const temaRender = montado ? tema : "light";
  const tamanhoFonteRender = montado ? tamanhoFonte : "normal";
  const fonteDislexiaRender = montado ? fonteDislexia : false;

  return (
    <div
      className="flex items-center gap-2"
      aria-label="Ferramentas de acessibilidade"
    >
      <button
        type="button"
        onClick={alternarTema}
        className={`inline-flex size-10 items-center justify-center rounded-lg border transition ${
          fonteDislexiaRender
            ? "border-blue-700 bg-blue-900 text-white"
            : "bg-(--card) text-(--foreground) hover:bg-(--muted)"
        }`}
        aria-label={
          temaRender === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
        }
        title={temaRender === "dark" ? "Tema claro" : "Tema escuro"}
        aria-pressed={temaRender === "dark"}
        suppressHydrationWarning
      >
        {temaRender === "dark" ? (
          <Sun className="size-5" aria-hidden="true" />
        ) : (
          <Moon className="size-5" aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={alternarTamanhoFonte}
        className={`inline-flex size-10 items-center justify-center rounded-lg border transition ${
          fonteDislexiaRender
            ? "border-blue-700 bg-blue-900 text-white"
            : "bg-(--card) text-(--foreground) hover:bg-(--muted)"
        }`}
        aria-label={`Alternar tamanho da fonte. Tamanho atual: ${tamanhoFonteRender}`}
        title={`Tamanho da fonte: ${tamanhoFonteRender}`}
        aria-pressed={tamanhoFonteRender !== "normal"}
        suppressHydrationWarning
      >
        <ALargeSmall className="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={alternarFonteDislexia}
        className={`inline-flex size-10 items-center justify-center rounded-lg border transition ${
          fonteDislexiaRender
            ? "border-blue-700 bg-blue-900 text-white"
            : "bg-(--card) text-(--foreground) hover:bg-(--muted)"
        }`}
        aria-label={
          fonteDislexiaRender
            ? "Desativar ajustes para dislexia"
            : "Ativar ajustes para dislexia"
        }
        title="Fonte para dislexia"
        aria-pressed={fonteDislexiaRender}
        suppressHydrationWarning
      >
        <BookOpenText className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
