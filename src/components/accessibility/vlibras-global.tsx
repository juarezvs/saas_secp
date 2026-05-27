"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    VLibras?: {
      Widget: new (url: string) => unknown;
    };
    __vlibrasWidget?: unknown;
  }
}

export function VlibrasGlobal() {
  useEffect(() => {
    const scriptId = "vlibras-plugin-script";

    function inicializar() {
      if (!window.VLibras?.Widget) {
        return;
      }

      if (window.__vlibrasWidget) {
        return;
      }

      window.__vlibrasWidget = new window.VLibras.Widget(
        "https://vlibras.gov.br/app",
      );
    }

    const scriptExistente = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;

    if (scriptExistente) {
      inicializar();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.async = true;
    script.onload = inicializar;

    document.body.appendChild(script);
  }, []);

  return (
    <div vw="true" className="enabled">
      <div vw-access-button="true" className="active" />
      <div vw-plugin-wrapper="true">
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>
  );
}
