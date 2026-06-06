"use client";

import { useEffect } from "react";

export function VlibrasGlobal() {
  useEffect(() => {
    const scriptId = "vlibras-plugin";

    function inicializar() {
      if (!window.VLibras?.Widget) {
        return;
      }

      if (window.__secpVLibrasWidget) {
        return;
      }

      window.__secpVLibrasWidget = new window.VLibras.Widget(
        "https://vlibras.gov.br/app",
      );
    }

    function abrir(tentativa = 0) {
      const botao = document.querySelector<HTMLElement>("[vw-access-button]");

      if (botao) {
        botao.click();
        return;
      }

      if (tentativa < 10) {
        window.setTimeout(() => abrir(tentativa + 1), 250);
      }
    }

    window.__secpAbrirVLibras = () => abrir();

    const scriptExistente = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;

    if (scriptExistente) {
      inicializar();
      return () => {
        delete window.__secpAbrirVLibras;
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.async = true;
    script.onload = inicializar;

    document.body.appendChild(script);

    return () => {
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
