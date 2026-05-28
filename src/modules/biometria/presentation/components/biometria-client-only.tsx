"use client";

import dynamic from "next/dynamic";

export const CadastroFacialAutoWizardClientOnly = dynamic(
  () =>
    import("./cadastro-facial-auto-wizard").then(
      (mod) => mod.CadastroFacialAutoWizard,
    ),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-xl border bg-(--card) p-5 shadow-sm">
        Carregando módulo de cadastro facial...
      </section>
    ),
  },
);

export const ValidacaoFacialCardClientOnly = dynamic(
  () =>
    import("./validacao-facial-card").then((mod) => mod.ValidacaoFacialCard),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-xl border bg-(--card) p-5 shadow-sm">
        Carregando reconhecimento facial...
      </section>
    ),
  },
);
