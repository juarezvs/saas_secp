"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  UserRound,
} from "lucide-react";

import { Button, Input, Label } from "@/components/ui";
import {
  loginAction,
  type LoginActionState,
} from "@/modules/auth/application/actions/login.action";

const estadoInicial: LoginActionState = {
  sucesso: false,
  mensagem: null,
};

const CREDENCIAIS_LOGIN_STORAGE_KEY = "secp.login.credenciais";

type CredenciaisLembradas = {
  matricula: string;
  senha: string;
};

function lerCredenciaisLembradas(): CredenciaisLembradas | null {
  try {
    const valor = window.localStorage.getItem(CREDENCIAIS_LOGIN_STORAGE_KEY);

    if (!valor) {
      return null;
    }

    const dados = JSON.parse(valor) as Partial<CredenciaisLembradas>;

    if (
      typeof dados.matricula !== "string" ||
      typeof dados.senha !== "string"
    ) {
      return null;
    }

    return {
      matricula: dados.matricula,
      senha: dados.senha,
    };
  } catch {
    return null;
  }
}

export function LoginForm() {
  const [estado, formAction, pendente] = useActionState(
    loginAction,
    estadoInicial,
  );
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarCredenciais, setLembrarCredenciais] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const credenciais = lerCredenciaisLembradas();

      if (!credenciais) {
        return;
      }

      setMatricula(credenciais.matricula);
      setSenha(credenciais.senha);
      setLembrarCredenciais(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function salvarPreferenciaLogin() {
    if (!lembrarCredenciais) {
      window.localStorage.removeItem(CREDENCIAIS_LOGIN_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      CREDENCIAIS_LOGIN_STORAGE_KEY,
      JSON.stringify({ matricula, senha }),
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={() => {
        salvarPreferenciaLogin();
      }}
    >
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
            value={matricula}
            onChange={(event) => setMatricula(event.target.value)}
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
            type={mostrarSenha ? "text" : "password"}
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            autoComplete="current-password"
            className="h-12 border-slate-200 bg-white pl-11 pr-12 text-slate-950 placeholder:text-slate-400"
            placeholder="Digite sua senha"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
            onClick={() => setMostrarSenha((valor) => !valor)}
          >
            {mostrarSenha ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <label className="-mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={lembrarCredenciais}
          onChange={(event) => setLembrarCredenciais(event.target.checked)}
          className="size-4 rounded border-slate-300 text-blue-950 accent-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        Lembrar matrícula e senha
      </label>

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
        href="https://esosti.trf1.jus.br/"
        target="_blank"
        rel="noreferrer"
        className="flex h-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-center text-sm font-bold text-blue-950 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Solicitar Suporte
      </a>
    </form>
  );
}
