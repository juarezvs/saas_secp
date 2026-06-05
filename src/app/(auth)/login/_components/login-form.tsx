"use client";

import { useState } from "react";
import { Loader2, LockKeyhole, UserRound } from "lucide-react";

import { Button, Input, Label } from "@/components/ui";

export function LoginForm() {
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);

  function simularLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem(null);

    if (!matricula.trim() || !senha.trim()) {
      setMensagem("Informe matrícula e senha da rede Windows.");
      return;
    }

    setPendente(true);
    window.setTimeout(() => {
      setPendente(false);
      setMensagem("Login mockado. A integração com Auth.js e LDAP será conectada em etapa posterior.");
    }, 600);
  }

  return (
    <form onSubmit={simularLogin} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="matricula">Matrícula</Label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="matricula"
            name="matricula"
            type="text"
            value={matricula}
            onChange={(event) => setMatricula(event.target.value)}
            autoComplete="username"
            className="pl-10"
            placeholder="Digite sua matrícula"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha da rede Windows</Label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="senha"
            name="senha"
            type="password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            autoComplete="current-password"
            className="pl-10"
            placeholder="Digite sua senha"
          />
        </div>
      </div>

      {mensagem && (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {mensagem}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Entrar
      </Button>

      <a href="mailto:nutec@sjam.jus.br" className="block text-center text-sm font-semibold text-secp-blue-700 hover:underline">
        Suporte NUTEC
      </a>
    </form>
  );
}

