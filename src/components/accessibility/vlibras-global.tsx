"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Accessibility } from "lucide-react";

const VLIBRAS_ROOT_ID = "secp-vlibras-root";
const VLIBRAS_SCRIPT_ID = "vlibras-plugin";
const VLIBRAS_SCRIPT_SRC = "https://vlibras.gov.br/app/vlibras-plugin.js";
const VLIBRAS_APP_URL = "https://vlibras.gov.br/app";

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
  accessButton.className = "active";

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
    accessButton.className = "active";
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

export function VlibrasGlobal() {
  const pathname = usePathname();

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

  return (
    <>
      <button
        type="button"
        onClick={() => void abrirVlibrasGlobal()}
        className="fixed bottom-4 right-4 z-[60] inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-lg transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:hidden"
        aria-label="Abrir tradutor VLibras"
        title="Abrir tradutor VLibras"
      >
        <Accessibility className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">VLibras</span>
      </button>

      <div id={VLIBRAS_ROOT_ID} vw="true" className="enabled">
        <div vw-access-button="true" className="active" />
        <div vw-plugin-wrapper="true">
          <div className="vw-plugin-top-wrapper" />
        </div>
      </div>
    </>
  );
}
