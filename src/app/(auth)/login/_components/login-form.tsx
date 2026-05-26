"use client";

import { useActionState } from "react";
import { Loader2, LockKeyhole, UserRound } from "lucide-react";
import {
  loginAction,
  type LoginActionState,
} from "@/modules/auth/application/actions/login.action";

const estadoInicial: LoginActionState = {
  sucesso: false,
  mensagem: null,
};

export function LoginForm() {
  const [estado, formAction, pendente] = useActionState(
    loginAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="matricula"
          className="text-sm font-medium text-slate-700"
        >
          Matrícula
        </label>

        <div className="relative">
          <UserRound
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="matricula"
            name="matricula"
            type="text"
            defaultValue={estado.campos?.matricula}
            autoComplete="username"
            className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            placeholder="Digite sua matrícula"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="senha" className="text-sm font-medium text-slate-700">
          Senha da rede
        </label>

        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            placeholder="Digite sua senha"
            required
          />
        </div>
      </div>

      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {estado.mensagem}
        </div>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pendente && <Loader2 className="size-4 animate-spin" />}
        Entrar no SECP
      </button>
    </form>
  );
}
