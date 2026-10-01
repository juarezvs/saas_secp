"use client";

import { useEffect } from "react";

const STORAGE_TEMA_VISUAL = "secp-color-theme";
const TEMAS_VALIDOS = new Set(["azul", "verde", "cinza"]);

export function ThemeBootstrap() {
  useEffect(() => {
    try {
      const tema = window.localStorage.getItem(STORAGE_TEMA_VISUAL);

      if (tema && TEMAS_VALIDOS.has(tema)) {
        document.documentElement.dataset.secpColorTheme = tema;
      }
    } catch {
      // Preferencia visual e opcional; falhas de storage nao devem afetar o app.
    }
  }, []);

  return null;
}

