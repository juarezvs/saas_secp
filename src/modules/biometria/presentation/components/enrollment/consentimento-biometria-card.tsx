"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

type ConsentimentoBiometriaCardProps = {
  carregando: boolean;
  erro?: string | null;
  onIniciar: () => void;
};

export function ConsentimentoBiometriaCard({
  carregando,
  erro,
  onIniciar,
}: ConsentimentoBiometriaCardProps) {
  const [aceito, setAceito] = useState(false);

  return (
    <section className="rounded-xl border bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Uso da biometria facial</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            A captura sera feita pela camera em tempo real, com prova de vida.
            Nao e permitido enviar foto. O SECP armazena o template facial
            criptografado e nao guarda a imagem bruta por padrao.
          </p>
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border p-4">
        <input
          type="checkbox"
          checked={aceito}
          onChange={(event) => setAceito(event.target.checked)}
          className="mt-1 size-4 accent-blue-900"
        />
        <span className="text-sm leading-6">
          Li e compreendi as informacoes sobre o uso da biometria facial.
        </span>
      </label>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
          {erro}
        </p>
      )}

      <button
        type="button"
        disabled={!aceito || carregando}
        onClick={onIniciar}
        className="mt-5 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {carregando ? "Iniciando..." : "Iniciar cadastro"}
      </button>
    </section>
  );
}
