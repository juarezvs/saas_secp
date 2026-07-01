"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function ActiveDirectoryTestFields() {
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <>
      <label className="min-w-32 text-xs font-semibold text-slate-600 dark:text-slate-300">
        Matrícula
        <input
          name="matricula"
          autoComplete="username"
          className="mt-1 h-9 w-full rounded-md border bg-[var(--card)] px-2 text-sm font-normal"
        />
      </label>
      <label className="min-w-32 text-xs font-semibold text-slate-600 dark:text-slate-300">
        Senha
        <span className="relative mt-1 block">
          <input
            name="senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="current-password"
            className="h-9 w-full rounded-md border bg-[var(--card)] px-2 pr-10 text-sm font-normal"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((atual) => !atual)}
            className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center rounded-r-md text-slate-500 hover:bg-[var(--muted)] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            aria-label={mostrarSenha ? "Esconder senha" : "Ver senha"}
            title={mostrarSenha ? "Esconder senha" : "Ver senha"}
          >
            {mostrarSenha ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </span>
      </label>
    </>
  );
}
