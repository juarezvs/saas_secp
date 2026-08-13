"use client";

import dynamic from "next/dynamic";

const TotemFacialPage = dynamic(
  () =>
    import("@/modules/totem/presentation/totem-facial-page").then(
      (modulo) => modulo.TotemFacialPage,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Preparando Modo Totem...
      </div>
    ),
  },
);

export function TotemFacialClient() {
  return <TotemFacialPage />;
}

