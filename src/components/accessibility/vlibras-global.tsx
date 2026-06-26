"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VLIBRAS_SCRIPT_ID = "vlibras-plugin";
const VLIBRAS_SCRIPT_SRC = "https://vlibras.gov.br/app/vlibras-plugin.js";
const VLIBRAS_APP_URL = "https://vlibras.gov.br/app";

function aguardar(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function VlibrasGlobal() {
  const pathname = usePathname();

  useEffect(() => {
    let desmontado = false;
    let refreshTimer: number | null = null;

    function widgetTemDomAtivo() {
      return Boolean(
        document.querySelector("[vw-access-button]") &&
          document.querySelector("[vw-plugin-wrapper]") &&
          document.querySelector(".vw-plugin-top-wrapper"),
      );
    }

    function inicializarWidget(forcar = false) {
      if (!window.VLibras?.Widget) {
        return false;
      }

      if (!forcar && window.__secpVLibrasWidget && widgetTemDomAtivo()) {
        return true;
      }

      window.__secpVLibrasWidget = new window.VLibras.Widget(VLIBRAS_APP_URL);
      return true;
    }

    function carregarScript() {
      if (window.VLibras?.Widget) {
        return Promise.resolve();
      }

      const scriptExistente = document.getElementById(
        VLIBRAS_SCRIPT_ID,
      ) as HTMLScriptElement | null;

      if (scriptExistente) {
        return new Promise<void>((resolve, reject) => {
          scriptExistente.addEventListener("load", () => resolve(), {
            once: true,
          });
          scriptExistente.addEventListener("error", () => reject(), {
            once: true,
          });

          if (window.VLibras?.Widget) {
            resolve();
          }
        });
      }

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.id = VLIBRAS_SCRIPT_ID;
        script.src = VLIBRAS_SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject();

        document.body.appendChild(script);
      });
    }

    function abrirPeloDom() {
      const botao = document.querySelector<HTMLElement>(
        "[vw-access-button]",
      );

      if (botao) {
        botao.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          }),
        );
      }

      const container = document.querySelector<HTMLElement>("[vw]");
      const wrapper = document.querySelector<HTMLElement>(
        "[vw-plugin-wrapper]",
      );
      const topWrapper = document.querySelector<HTMLElement>(
        ".vw-plugin-top-wrapper",
      );

      container?.classList.add("enabled");
      container?.classList.add("active");
      wrapper?.classList.add("active");
      topWrapper?.classList.add("active");

      return Boolean(botao || wrapper);
    }

    async function prepararWidget(forcar = false) {
      await carregarScript();

      for (let tentativa = 0; tentativa < 12; tentativa += 1) {
        if (desmontado) {
          return false;
        }

        if (inicializarWidget(forcar && tentativa === 0)) {
          await aguardar(150);
          return true;
        }

        await aguardar(250);
      }

      return false;
    }

    async function abrir() {
      const pronto = await prepararWidget();

      if (!pronto || desmontado) {
        return;
      }

      for (let tentativa = 0; tentativa < 12; tentativa += 1) {
        if (abrirPeloDom()) {
          return;
        }

        await aguardar(250);
      }
    }

    function agendarRefresh(forcar = false) {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void prepararWidget(forcar);
      }, 150);
    }

    function aoVoltarParaPagina() {
      agendarRefresh(false);
    }

    window.__secpAbrirVLibras = () => {
      void abrir();
    };
    void prepararWidget();

    window.addEventListener("pageshow", aoVoltarParaPagina);
    window.addEventListener("focus", aoVoltarParaPagina);
    document.addEventListener("visibilitychange", aoVoltarParaPagina);

    agendarRefresh(true);

    return () => {
      desmontado = true;
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }
      window.removeEventListener("pageshow", aoVoltarParaPagina);
      window.removeEventListener("focus", aoVoltarParaPagina);
      document.removeEventListener("visibilitychange", aoVoltarParaPagina);
      delete window.__secpAbrirVLibras;
    };
  }, [pathname]);

  return (
    <div vw="true" className="enabled">
      <div vw-access-button="true" className="active" />
      <div vw-plugin-wrapper="true">
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>
  );
}
