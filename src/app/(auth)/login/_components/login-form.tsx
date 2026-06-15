"use client";

import { useActionState } from "react";
import { Loader2, LockKeyhole, UserRound } from "lucide-react";

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
        <Label htmlFor="matricula">Matrícula</Label>
        <div className="relative">
          <UserRound
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="matricula"
            name="matricula"
            type="text"
            defaultValue={estado.campos?.matricula ?? ""}
            autoComplete="username"
            className="pl-10"
            placeholder="Digite sua matrícula"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha da rede Windows</Label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            className="pl-10"
            placeholder="Digite sua senha"
            required
          />
        </div>
      </div>

      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          {estado.mensagem}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        Entrar
      </Button>

      <a
        href="mailto:nutec@sjam.jus.br"
        className="block text-center text-sm font-semibold text-secp-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Suporte NUTEC
      </a>
    </form>
  );
}
