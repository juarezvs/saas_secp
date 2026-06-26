import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { LoginForm } from "./_components/login-form";

const pontosConfianca = [
  "Autenticação institucional",
  "Perfil carregado em tempo real",
  "Fuso e regras por órgão",
];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section
          className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(2, 6, 23, 0.96), rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.36)), url('https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=2200&q=80')",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="relative z-10 p-10 xl:p-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Apresentação
            </Link>

            <div className="mt-14 max-w-3xl">
              <div className="inline-flex items-center gap-3 rounded-md border border-cyan-200/30 bg-cyan-100/10 px-4 py-2 text-sm font-bold text-cyan-50">
                <Building2 className="size-4" aria-hidden="true" />
                Justiça Federal · SECP
              </div>
              <h1 className="mt-6 text-5xl font-black tracking-normal text-white xl:text-7xl">
                Frequência funcional com governança.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100">
                Acesso seguro ao controle eletrônico de ponto, espelho,
                solicitações, homologação e banco de horas em ambiente
                multi-órgãos.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid gap-3 border-t border-white/15 bg-slate-950/35 p-10 backdrop-blur-sm xl:grid-cols-3 xl:p-12">
            {pontosConfianca.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-300" />
                <span className="text-sm font-semibold text-slate-100">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),linear-gradient(180deg,#f8fafc,#eef4fb)] px-6 py-10 text-slate-950">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-950 hover:underline"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Apresentação
              </Link>
              <div className="flex size-10 items-center justify-center rounded-md bg-blue-950 text-sm font-black text-white">
                SE
              </div>
            </div>

            <div className="rounded-lg border border-white/70 bg-white/95 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase text-blue-900">
                    Acesso institucional
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950">
                    Entrar no SECP
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Use sua matrícula e senha da rede para carregar os perfis e
                    permissões atualizados.
                  </p>
                </div>
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-blue-950 text-white">
                  <LockKeyhole className="size-6" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-7">
                <LoginForm />
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-blue-100 bg-white/80 p-4 text-sm leading-6 text-slate-700 shadow-sm">
              <div className="flex gap-3">
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-blue-900"
                  aria-hidden="true"
                />
                <p>
                  O órgão é identificado pelo vínculo funcional do servidor e
                  pelas lotações cadastradas no SECP.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
