import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { LoginForm } from "./_components/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1fr_30rem]">
        <section className="hidden secp-institutional-gradient text-white lg:flex lg:flex-col lg:justify-between">
          <div className="p-10">
            <Link href="/" className="inline-flex rounded-md bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">
              Justiça Federal do Amazonas
            </Link>
            <h1 className="mt-10 max-w-3xl text-4xl font-bold tracking-normal">
              SECP
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              Acesse com matrícula e senha da rede Windows para operar os fluxos institucionais de frequência.
            </p>
          </div>
          <div className="border-t border-white/10 p-10 text-sm text-white/75">
            Sistema Eletrônico de Controle de Ponto
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-8 inline-flex text-sm font-semibold text-secp-blue-700 hover:underline">
              Voltar para apresentação
            </Link>
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase text-secp-blue-700">Acesso institucional</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal">Entrar no SECP</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Acesse com sua matrícula e senha da rede Windows.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-card">
              <LoginForm />
            </div>

            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <p>
                  Problemas de acesso? Acione o NUTEC pelo canal institucional de suporte.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

