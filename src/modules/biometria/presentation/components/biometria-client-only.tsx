"use client";

import dynamic from "next/dynamic";

export const ValidacaoFacialCardClientOnly = dynamic(
  () =>
    import("./validacao-facial-card").then((mod) => mod.ValidacaoFacialCard),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-xl border bg-(--card) p-5 text-sm text-(--muted-foreground) shadow-sm">
        Carregando validação facial...
      </section>
    ),
  },
);

export const CadastroFacialWizardClientOnly = dynamic(
  () =>
    import("./cadastro-facial-wizard").then((mod) => mod.CadastroFacialWizard),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-xl border bg-(--card) p-5 text-sm text-(--muted-foreground) shadow-sm">
        Carregando cadastro facial...
      </section>
    ),
  },
);
