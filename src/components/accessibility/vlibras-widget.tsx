"use client";

import Script from "next/script";

function inicializarVLibras() {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.VLibras?.Widget) {
    console.warn("VLibras ainda não está disponível em window.VLibras.");
    return;
  }

  if (window.__secpVlibrasInicializado) {
    return;
  }

  new window.VLibras.Widget("https://vlibras.gov.br/app");
  window.__secpVlibrasInicializado = true;
}

export function VlibrasWidget() {
  return (
    <>
      <div vw="true" className="enabled">
        <div vw-access-button="true" className="active" />
        <div vw-plugin-wrapper="true">
          <div className="vw-plugin-top-wrapper" />
        </div>
      </div>

      <Script
        id="vlibras-plugin"
        src="https://vlibras.gov.br/app/vlibras-plugin.js"
        strategy="afterInteractive"
        onReady={inicializarVLibras}
        onError={() => {
          console.error("Erro ao carregar o plugin VLibras.");
        }}
      />
    </>
  );
}
