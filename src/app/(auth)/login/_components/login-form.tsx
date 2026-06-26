"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2, LockKeyhole, UserRound } from "lucide-react";

import { Button, Input, Label } from "@/components/ui";
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
        <Label htmlFor="matricula" className="text-slate-800">
          Matrícula
        </Label>
        <div className="relative">
          <UserRound
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            id="matricula"
            name="matricula"
            type="text"
            defaultValue={estado.campos?.matricula ?? ""}
            autoComplete="username"
            className="h-12 border-slate-200 bg-white pl-11 text-slate-950 placeholder:text-slate-400"
            placeholder="Digite sua matrícula"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha" className="text-slate-800">
          Senha da rede
        </Label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            className="h-12 border-slate-200 bg-white pl-11 text-slate-950 placeholder:text-slate-400"
            placeholder="Digite sua senha"
            required
          />
        </div>
      </div>

      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {estado.mensagem}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full bg-blue-950 text-white hover:bg-blue-900"
        disabled={pendente}
      >
        {pendente && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        Entrar no SECP
        {!pendente && <ArrowRight className="size-4" aria-hidden="true" />}
      </Button>

      <a
        href="mailto:nutec@sjam.jus.br"
        className="flex h-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-center text-sm font-bold text-blue-950 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Suporte NUTEC
      </a>
    </form>
  );
}
