"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { usePathname } from "next/navigation";
import { Accessibility } from "lucide-react";
import type { PosicaoVlibrasAcessibilidade } from "@/modules/auth/application/services/preferencias-acessibilidade.service";

const VLIBRAS_ROOT_ID = "secp-vlibras-root";
const VLIBRAS_SCRIPT_ID = "vlibras-plugin";
const VLIBRAS_SCRIPT_SRC = "https://vlibras.gov.br/app/vlibras-plugin.js";
const VLIBRAS_APP_URL = "https://vlibras.gov.br/app";
const VLIBRAS_BUTTON_WIDTH_ESTIMADO = 132;
const VLIBRAS_BUTTON_HEIGHT_ESTIMADO = 44;
const VLIBRAS_BUTTON_MARGIN = 16;
const VLIBRAS_DRAG_THRESHOLD = 4;

type EstadoArrasto = {
  pointerId: number | null;
  offsetX: number;
  offsetY: number;
  inicioX: number;
  inicioY: number;
  moveu: boolean;
};

function aguardar(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function obterRootVlibras() {
  return document.getElementById(VLIBRAS_ROOT_ID);
}

function criarMarkupVlibras() {
  const root = document.createElement("div");
  root.id = VLIBRAS_ROOT_ID;
  root.setAttribute("vw", "true");
  root.className = "enabled";

  const accessButton = document.createElement("div");
  accessButton.setAttribute("vw-access-button", "true");
  accessButton.className = "active secp-vlibras-native-button";

  const pluginWrapper = document.createElement("div");
  pluginWrapper.setAttribute("vw-plugin-wrapper", "true");

  const topWrapper = document.createElement("div");
  topWrapper.className = "vw-plugin-top-wrapper";

  pluginWrapper.appendChild(topWrapper);
  root.appendChild(accessButton);
  root.appendChild(pluginWrapper);
  document.body.appendChild(root);

  return root;
}

function garantirMarkupVlibras() {
  const root = obterRootVlibras() ?? criarMarkupVlibras();

  if (!root.querySelector("[vw-access-button]")) {
    const accessButton = document.createElement("div");
    accessButton.setAttribute("vw-access-button", "true");
    accessButton.className = "active secp-vlibras-native-button";
    root.prepend(accessButton);
  }

  if (!root.querySelector("[vw-plugin-wrapper]")) {
    const pluginWrapper = document.createElement("div");
    pluginWrapper.setAttribute("vw-plugin-wrapper", "true");

    const topWrapper = document.createElement("div");
    topWrapper.className = "vw-plugin-top-wrapper";

    pluginWrapper.appendChild(topWrapper);
    root.appendChild(pluginWrapper);
  }

  root.classList.add("enabled");

  return root;
}

function widgetTemDomAtivo() {
  const root = obterRootVlibras();

  return Boolean(
    root?.querySelector("[vw-access-button]") &&
    root.querySelector("[vw-plugin-wrapper]") &&
    root.querySelector(".vw-plugin-top-wrapper"),
  );
}

function carregarScriptVlibras() {
  if (window.VLibras?.Widget) {
    return Promise.resolve();
  }

  if (window.__secpVLibrasScriptPromise) {
    return window.__secpVLibrasScriptPromise;
  }

  const scriptAntigo = document.getElementById(VLIBRAS_SCRIPT_ID);

  if (scriptAntigo && !window.VLibras?.Widget) {
    scriptAntigo.remove();
  }

  window.__secpVLibrasScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      script.remove();
      window.__secpVLibrasScriptPromise = undefined;
      reject(new Error("Tempo limite ao carregar o VLibras."));
    }, 15000);

    script.id = VLIBRAS_SCRIPT_ID;
    script.src = VLIBRAS_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      window.__secpVLibrasScriptPromise = undefined;
      reject(new Error("Não foi possível carregar o VLibras."));
    };

    document.body.appendChild(script);
  });

  return window.__secpVLibrasScriptPromise;
}

function inicializarWidgetVlibras(forcar = false) {
  if (!window.VLibras?.Widget) {
    return false;
  }

  garantirMarkupVlibras();

  if (!forcar && window.__secpVLibrasWidget && widgetTemDomAtivo()) {
    return true;
  }

  window.__secpVLibrasWidget = new window.VLibras.Widget(VLIBRAS_APP_URL);

  return true;
}

async function prepararWidgetVlibras(forcar = false) {
  garantirMarkupVlibras();

  try {
    await carregarScriptVlibras();
  } catch {
    return false;
  }

  for (let tentativa = 0; tentativa < 16; tentativa += 1) {
    if (inicializarWidgetVlibras(forcar && tentativa === 0)) {
      await aguardar(150);
      return true;
    }

    await aguardar(250);
  }

  return false;
}

function abrirPeloDom() {
  const root = garantirMarkupVlibras();
  const botao = root.querySelector<HTMLElement>("[vw-access-button]");
  const wrapper = root.querySelector<HTMLElement>("[vw-plugin-wrapper]");
  const topWrapper = root.querySelector<HTMLElement>(".vw-plugin-top-wrapper");

  botao?.click();
  botao?.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );

  root.classList.add("enabled", "active");
  wrapper?.classList.add("active");
  topWrapper?.classList.add("active");

  return Boolean(botao || wrapper);
}

async function abrirVlibrasGlobal() {
  const pronto = await prepararWidgetVlibras(!widgetTemDomAtivo());

  if (!pronto) {
    return;
  }

  for (let tentativa = 0; tentativa < 16; tentativa += 1) {
    if (abrirPeloDom()) {
      return;
    }

    await aguardar(250);
  }
}

function agendarPreparacaoVlibras(forcar = false, atraso = 120) {
  if (window.__secpVLibrasRefreshTimer) {
    window.clearTimeout(window.__secpVLibrasRefreshTimer);
  }

  window.__secpVLibrasRefreshTimer = window.setTimeout(() => {
    window.__secpVLibrasRefreshTimer = undefined;
    void prepararWidgetVlibras(forcar);
  }, atraso);
}

function limitarPosicaoVlibras(
  posicao: PosicaoVlibrasAcessibilidade,
  elemento?: HTMLElement | null,
): PosicaoVlibrasAcessibilidade {
  if (typeof window === "undefined") {
    return posicao;
  }

  const largura = elemento?.offsetWidth || VLIBRAS_BUTTON_WIDTH_ESTIMADO;
  const altura = elemento?.offsetHeight || VLIBRAS_BUTTON_HEIGHT_ESTIMADO;
  const maxX = Math.max(
    VLIBRAS_BUTTON_MARGIN,
    window.innerWidth - largura - VLIBRAS_BUTTON_MARGIN,
  );
  const maxY = Math.max(
    VLIBRAS_BUTTON_MARGIN,
    window.innerHeight - altura - VLIBRAS_BUTTON_MARGIN,
  );

  return {
    x: Math.min(Math.max(Math.round(posicao.x), VLIBRAS_BUTTON_MARGIN), maxX),
    y: Math.min(Math.max(Math.round(posicao.y), VLIBRAS_BUTTON_MARGIN), maxY),
  };
}

function obterPosicaoPadraoVlibras(
  elemento?: HTMLElement | null,
): PosicaoVlibrasAcessibilidade {
  if (typeof window === "undefined") {
    return {
      x: VLIBRAS_BUTTON_MARGIN,
      y: VLIBRAS_BUTTON_MARGIN,
    };
  }

  const largura = elemento?.offsetWidth || VLIBRAS_BUTTON_WIDTH_ESTIMADO;
  const altura = elemento?.offsetHeight || VLIBRAS_BUTTON_HEIGHT_ESTIMADO;

  return limitarPosicaoVlibras(
    {
      x: window.innerWidth - largura - VLIBRAS_BUTTON_MARGIN,
      y: window.innerHeight - altura - VLIBRAS_BUTTON_MARGIN,
    },
    elemento,
  );
}

function isPosicaoVlibras(
  valor: unknown,
): valor is PosicaoVlibrasAcessibilidade {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return false;
  }

  const objeto = valor as Record<string, unknown>;

  return Number.isFinite(Number(objeto.x)) && Number.isFinite(Number(objeto.y));
}

async function carregarPosicaoVlibras() {
  const resposta = await fetch("/api/sessao/acessibilidade", {
    method: "GET",
    cache: "no-store",
  });

  if (!resposta.ok) {
    return null;
  }

  const dados = (await resposta.json().catch(() => null)) as {
    preferencias?: { vlibrasPosicao?: unknown };
  } | null;
  const posicao = dados?.preferencias?.vlibrasPosicao;

  return isPosicaoVlibras(posicao)
    ? {
        x: Number(posicao.x),
        y: Number(posicao.y),
      }
    : null;
}

async function salvarPosicaoVlibras(posicao: PosicaoVlibrasAcessibilidade) {
  await fetch("/api/sessao/acessibilidade", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vlibrasPosicao: posicao,
    }),
  }).catch(() => undefined);
}

export function VlibrasGlobal() {
  const pathname = usePathname();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const posicaoRef = useRef<PosicaoVlibrasAcessibilidade | null>(null);
  const arrastoRef = useRef<EstadoArrasto>({
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
    inicioX: 0,
    inicioY: 0,
    moveu: false,
  });
  const [posicao, setPosicao] = useState<PosicaoVlibrasAcessibilidade | null>(
    null,
  );

  const posicionar = useCallback(
    (proximaPosicao: PosicaoVlibrasAcessibilidade) => {
      const posicaoLimitada = limitarPosicaoVlibras(
        proximaPosicao,
        botaoRef.current,
      );

      posicaoRef.current = posicaoLimitada;
      setPosicao(posicaoLimitada);

      return posicaoLimitada;
    },
    [],
  );

  useEffect(() => {
    function aoVoltarParaPagina() {
      agendarPreparacaoVlibras(false);
    }

    function aoSolicitarAbertura() {
      void abrirVlibrasGlobal();
    }

    window.__secpAbrirVLibras = abrirVlibrasGlobal;
    window.addEventListener("pageshow", aoVoltarParaPagina);
    window.addEventListener("focus", aoVoltarParaPagina);
    window.addEventListener("secp:abrir-vlibras", aoSolicitarAbertura);
    document.addEventListener("visibilitychange", aoVoltarParaPagina);

    void prepararWidgetVlibras();

    return () => {
      window.removeEventListener("pageshow", aoVoltarParaPagina);
      window.removeEventListener("focus", aoVoltarParaPagina);
      window.removeEventListener("secp:abrir-vlibras", aoSolicitarAbertura);
      document.removeEventListener("visibilitychange", aoVoltarParaPagina);
    };
  }, []);

  useEffect(() => {
    agendarPreparacaoVlibras(!widgetTemDomAtivo());
  }, [pathname]);

  useEffect(() => {
    let cancelado = false;

    void carregarPosicaoVlibras()
      .then((posicaoSalva) => {
        if (cancelado) {
          return;
        }

        posicionar(posicaoSalva ?? obterPosicaoPadraoVlibras(botaoRef.current));
      })
      .catch(() => {
        if (!cancelado) {
          posicionar(obterPosicaoPadraoVlibras(botaoRef.current));
        }
      });

    return () => {
      cancelado = true;
    };
  }, [posicionar]);

  useEffect(() => {
    function aoRedimensionar() {
      setPosicao((posicaoAtual) =>
        posicaoAtual
          ? limitarPosicaoVlibras(posicaoAtual, botaoRef.current)
          : obterPosicaoPadraoVlibras(botaoRef.current),
      );
    }

    window.addEventListener("resize", aoRedimensionar);

    return () => {
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, []);

  function aoPointerDown(evento: PointerEvent<HTMLButtonElement>) {
    if (evento.button !== 0) {
      return;
    }

    const rect = evento.currentTarget.getBoundingClientRect();
    const posicaoAtual =
      posicao ??
      posicaoRef.current ??
      obterPosicaoPadraoVlibras(evento.currentTarget);

    arrastoRef.current = {
      pointerId: evento.pointerId,
      offsetX: evento.clientX - rect.left,
      offsetY: evento.clientY - rect.top,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      moveu: false,
    };

    setPosicao(posicaoAtual);
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function aoPointerMove(evento: PointerEvent<HTMLButtonElement>) {
    const arrasto = arrastoRef.current;

    if (arrasto.pointerId !== evento.pointerId) {
      return;
    }

    if (
      !arrasto.moveu &&
      Math.hypot(
        evento.clientX - arrasto.inicioX,
        evento.clientY - arrasto.inicioY,
      ) > VLIBRAS_DRAG_THRESHOLD
    ) {
      arrasto.moveu = true;
    }

    if (!arrasto.moveu) {
      return;
    }

    evento.preventDefault();
    posicionar({
      x: evento.clientX - arrasto.offsetX,
      y: evento.clientY - arrasto.offsetY,
    });
  }

  function finalizarArrasto(
    evento: PointerEvent<HTMLButtonElement>,
    deveAbrirAoClique: boolean,
  ) {
    const arrasto = arrastoRef.current;

    if (arrasto.pointerId !== evento.pointerId) {
      return;
    }

    arrastoRef.current = {
      pointerId: null,
      offsetX: 0,
      offsetY: 0,
      inicioX: 0,
      inicioY: 0,
      moveu: false,
    };

    try {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    } catch {
      // O navegador pode liberar a captura automaticamente em alguns gestos.
    }

    if (arrasto.moveu) {
      const posicaoFinal = limitarPosicaoVlibras(
        posicaoRef.current ?? obterPosicaoPadraoVlibras(evento.currentTarget),
        evento.currentTarget,
      );
      posicaoRef.current = posicaoFinal;
      setPosicao(posicaoFinal);
      void salvarPosicaoVlibras(posicaoFinal);
      return;
    }

    if (deveAbrirAoClique) {
      void abrirVlibrasGlobal();
    }
  }

  function aoPointerUp(evento: PointerEvent<HTMLButtonElement>) {
    finalizarArrasto(evento, true);
  }

  function aoPointerCancel(evento: PointerEvent<HTMLButtonElement>) {
    finalizarArrasto(evento, false);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      void abrirVlibrasGlobal();
    }
  }

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onPointerDown={aoPointerDown}
        onPointerMove={aoPointerMove}
        onPointerUp={aoPointerUp}
        onPointerCancel={aoPointerCancel}
        onKeyDown={aoTeclar}
        className="fixed z-[60] inline-flex h-11 touch-none select-none items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-lg transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:hidden"
        style={
          posicao
            ? {
                left: posicao.x,
                top: posicao.y,
              }
            : {
                right: VLIBRAS_BUTTON_MARGIN,
                bottom: VLIBRAS_BUTTON_MARGIN,
              }
        }
        aria-label="Abrir tradutor VLibras"
        title="Clique para abrir o VLibras. Arraste para reposicionar."
      >
        <Accessibility className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">VLibras</span>
      </button>

      <div id={VLIBRAS_ROOT_ID} vw="true" className="enabled">
        <div
          vw-access-button="true"
          className="active secp-vlibras-native-button"
        />
        <div vw-plugin-wrapper="true">
          <div className="vw-plugin-top-wrapper" />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
#${VLIBRAS_ROOT_ID} [vw-access-button],
#${VLIBRAS_ROOT_ID} .secp-vlibras-native-button {
  height: 1px !important;
  opacity: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
  position: fixed !important;
  right: 0 !important;
  top: 0 !important;
  width: 1px !important;
  z-index: -1 !important;
}
          `.trim(),
        }}
      />
    </>
  );
}
