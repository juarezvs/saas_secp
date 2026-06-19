"use client";

import { useEffect } from "react";

const VLIBRAS_SCRIPT_ID = "vlibras-plugin";
const VLIBRAS_SCRIPT_SRC = "https://vlibras.gov.br/app/vlibras-plugin.js";
const VLIBRAS_APP_URL = "https://vlibras.gov.br/app";

function aguardar(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function VlibrasGlobal() {
  useEffect(() => {
    let desmontado = false;

    function inicializarWidget() {
      if (!window.VLibras?.Widget) {
        return false;
      }

      if (window.__secpVLibrasWidget) {
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
        "[vw-access-button], .vw-access-button",
      );

      if (botao) {
        botao.click();
      }

      const wrapper = document.querySelector<HTMLElement>(
        "[vw-plugin-wrapper]",
      );
      const topWrapper = document.querySelector<HTMLElement>(
        ".vw-plugin-top-wrapper",
      );

      wrapper?.classList.add("active");
      topWrapper?.classList.add("active");

      return Boolean(botao || wrapper);
    }

    async function prepararWidget() {
      await carregarScript();

      for (let tentativa = 0; tentativa < 12; tentativa += 1) {
        if (desmontado) {
          return false;
        }

        if (inicializarWidget()) {
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

    window.__secpAbrirVLibras = () => {
      void abrir();
    };
    void prepararWidget();

    return () => {
      desmontado = true;
      delete window.__secpAbrirVLibras;
    };
  }, []);

  return (
    <div vw="" className="enabled">
      <div vw-access-button="" className="active" />
      <div vw-plugin-wrapper="">
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>
  );
}
