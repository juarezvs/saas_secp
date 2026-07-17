"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  Contrast,
  Moon,
  RotateCcw,
  Sun,
} from "lucide-react";
import {
  PREFERENCIAS_ACESSIBILIDADE_PADRAO,
  TAMANHOS_FONTE_ACESSIBILIDADE,
  type PreferenciasAcessibilidade,
  type TamanhoFonteAcessibilidade,
  type TemaAcessibilidade,
  type TemaVisualAcessibilidade,
} from "@/modules/auth/application/services/preferencias-acessibilidade.service";

const STORAGE_TEMA = "secp-tema";
const STORAGE_TAMANHO_FONTE = "secp-tamanho-fonte";
const STORAGE_FONTE_DISLEXIA = "secp-fonte-dislexia";
const STORAGE_ALTO_CONTRASTE = "secp-alto-contraste";

function aplicarTema(tema: TemaAcessibilidade) {
  const root = document.documentElement;

  if (tema === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  window.localStorage.setItem(STORAGE_TEMA, tema);
}

function aplicarTamanhoFonte(tamanho: TamanhoFonteAcessibilidade) {
  document.documentElement.dataset.fontSize = tamanho;
  window.localStorage.setItem(STORAGE_TAMANHO_FONTE, tamanho);
}

function aplicarFonteDislexia(ativo: boolean) {
  document.body.dataset.dyslexiaFont = String(ativo);
  window.localStorage.setItem(STORAGE_FONTE_DISLEXIA, String(ativo));
}

function aplicarAltoContraste(ativo: boolean) {
  document.documentElement.classList.toggle("contrast-more", ativo);
  window.localStorage.setItem(STORAGE_ALTO_CONTRASTE, String(ativo));
}

function obterClasseBotao(ativo: boolean) {
  return `relative inline-flex size-10 shrink-0 items-center justify-center rounded-md border text-sm shadow-sm backdrop-blur transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-45 ${
    ativo
      ? "border-cyan-200/70 bg-secp-blue-950/75 text-white shadow-cyan-950/20 ring-1 ring-cyan-100/30"
      : "border-white/20 bg-white/10 text-white hover:border-white/35 hover:bg-white/18"
  }`;
}

function IndicadorTamanhoFonte({
  tamanho,
}: {
  tamanho: TamanhoFonteAcessibilidade;
}) {
  if (tamanho === "16") {
    return null;
  }

  return (
    <span
      className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black leading-none text-slate-950 shadow-sm ring-1 ring-white/80"
      aria-hidden="true"
    >
      {tamanho}
    </span>
  );
}

export function AccessibilityToolbar({
  preferenciasIniciais = PREFERENCIAS_ACESSIBILIDADE_PADRAO,
}: {
  preferenciasIniciais?: PreferenciasAcessibilidade;
}) {
  const primeiraPersistencia = useRef(true);
  const [tema, setTema] = useState<TemaAcessibilidade>(
    preferenciasIniciais.tema,
  );
  const [tamanhoFonte, setTamanhoFonte] = useState<TamanhoFonteAcessibilidade>(
    preferenciasIniciais.tamanhoFonte,
  );
  const [fonteDislexia, setFonteDislexia] = useState<boolean>(
    preferenciasIniciais.fonteDislexia,
  );
  const [altoContraste, setAltoContraste] = useState<boolean>(
    preferenciasIniciais.altoContraste,
  );
  const [temaVisual, setTemaVisual] = useState<TemaVisualAcessibilidade>(
    preferenciasIniciais.temaVisual,
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

  useEffect(() => {
    aplicarAltoContraste(altoContraste);
  }, [altoContraste]);

  useEffect(() => {
    function atualizarTemaVisual(event: Event) {
      const novoTema = (event as CustomEvent<TemaVisualAcessibilidade>).detail;

      if (
        novoTema === "padrao" ||
        novoTema === "azul" ||
        novoTema === "verde" ||
        novoTema === "cinza"
      ) {
        setTemaVisual(novoTema);
      }
    }

    window.addEventListener("secp:tema-visual", atualizarTemaVisual);

    return () =>
      window.removeEventListener("secp:tema-visual", atualizarTemaVisual);
  }, []);

  useEffect(() => {
    if (primeiraPersistencia.current) {
      primeiraPersistencia.current = false;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch("/api/sessao/acessibilidade", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tema,
          temaVisual,
          tamanhoFonte,
          fonteDislexia,
          altoContraste,
        }),
        signal: controller.signal,
      }).catch(() => undefined);
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [tema, temaVisual, tamanhoFonte, fonteDislexia, altoContraste]);

  function alternarTema() {
    setTema((temaAtual) => (temaAtual === "dark" ? "light" : "dark"));
  }

  function aumentarFonte() {
    setTamanhoFonte((tamanhoAtual) => {
      const indiceAtual = TAMANHOS_FONTE_ACESSIBILIDADE.indexOf(tamanhoAtual);
      return TAMANHOS_FONTE_ACESSIBILIDADE[
        Math.min(indiceAtual + 1, TAMANHOS_FONTE_ACESSIBILIDADE.length - 1)
      ];
    });
  }

  function diminuirFonte() {
    setTamanhoFonte((tamanhoAtual) => {
      const indiceAtual = TAMANHOS_FONTE_ACESSIBILIDADE.indexOf(tamanhoAtual);
      return TAMANHOS_FONTE_ACESSIBILIDADE[Math.max(indiceAtual - 1, 0)];
    });
  }

  function restaurarFontePadrao() {
    setTamanhoFonte("16");
  }

  function alternarFonteDislexia() {
    setFonteDislexia((ativoAtual) => !ativoAtual);
  }

  return (
    <div
      className="flex items-center gap-2"
      role="toolbar"
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
        onClick={aumentarFonte}
        className={obterClasseBotao(tamanhoFonte !== "16")}
        aria-label={`Aumentar fonte. Tamanho atual: ${tamanhoFonte}px`}
        title="Aumentar fonte"
        aria-pressed={tamanhoFonte !== "16"}
        disabled={tamanhoFonte === "30"}
        suppressHydrationWarning
      >
        <span aria-hidden="true" className="font-bold">
          A+
        </span>
        <IndicadorTamanhoFonte tamanho={tamanhoFonte} />
      </button>

      <button
        type="button"
        onClick={restaurarFontePadrao}
        className={obterClasseBotao(tamanhoFonte !== "16")}
        aria-label={`Restaurar fonte padrão. Tamanho atual: ${tamanhoFonte}px`}
        title="Fonte padrão"
        disabled={tamanhoFonte === "16"}
        suppressHydrationWarning
      >
        <RotateCcw className="size-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={diminuirFonte}
        className={obterClasseBotao(false)}
        aria-label={`Diminuir fonte. Tamanho atual: ${tamanhoFonte}px`}
        title="Diminuir fonte"
        disabled={tamanhoFonte === "13"}
        suppressHydrationWarning
      >
        <span aria-hidden="true" className="font-bold">
          A-
        </span>
        <IndicadorTamanhoFonte tamanho={tamanhoFonte} />
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

      <button
        type="button"
        onClick={() => setAltoContraste((ativoAtual) => !ativoAtual)}
        className={obterClasseBotao(altoContraste)}
        aria-label={
          altoContraste ? "Desativar alto contraste" : "Ativar alto contraste"
        }
        title="Alto contraste"
        aria-pressed={altoContraste}
        suppressHydrationWarning
      >
        <Contrast className="size-5" aria-hidden="true" />
      </button>

    </div>
  );
}
