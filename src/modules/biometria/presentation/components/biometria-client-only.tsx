"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

type ValidacaoFacialCardProps = {
  servidorId: string;
};

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

export const ValidacaoFacialCardClientOnly = dynamic<ValidacaoFacialCardProps>(
  () =>
    import("./validacao-facial-card").then(
      (mod) =>
        mod.ValidacaoFacialCard as ComponentType<ValidacaoFacialCardProps>,
    ),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-xl border bg-(--card) p-5 shadow-sm">
        Carregando reconhecimento facial...
      </section>
    ),
  },
);
