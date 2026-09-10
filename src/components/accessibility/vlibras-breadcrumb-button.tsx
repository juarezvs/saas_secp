"use client";

import { Accessibility } from "lucide-react";

export function VlibrasBreadcrumbButton({
  variant = "default",
}: {
  variant?: "default" | "header";
}) {
  function abrirVLibras() {
    if (window.__secpAbrirVLibras) {
      void window.__secpAbrirVLibras();
      return;
    }

    window.dispatchEvent(new Event("secp:abrir-vlibras"));
  }

  return (
    <button
      type="button"
      onClick={abrirVLibras}
      className={
        variant === "header"
          ? "inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white px-4 text-sm font-black text-slate-950 shadow-sm transition hover:bg-white/95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          : "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      }
      aria-label="Abrir tradutor VLibras"
      title="VLibras"
    >
      <Accessibility className="size-4" aria-hidden="true" />
      <span className="hidden xl:inline">VLibras</span>
    </button>
  );
}
