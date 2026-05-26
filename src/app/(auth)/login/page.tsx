import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
        <section className="hidden bg-blue-950 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="p-10">
            <div className="mb-10 inline-flex rounded-md bg-white/10 px-3 py-2 text-sm font-semibold">
              Justiça Federal — SJAM
            </div>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight">
              Sistema Eletrônico de Controle de Ponto
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">
              Controle institucional de frequência, jornada, banco de horas,
              solicitações, homologações e relatórios funcionais.
            </p>
          </div>

          <div className="border-t border-white/10 p-10 text-sm text-blue-100">
            SECP • Governança digital de frequência funcional
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">
                Acesso institucional
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Entrar com matrícula
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Utilize sua matrícula e senha da rede Windows. Neste MVP, o
                usuário inicial é <strong>secp</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <LoginForm />
            </div>

            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              <strong>Base normativa:</strong> o sistema apoiará o registro,
              armazenamento, apuração e gestão da frequência funcional conforme
              a Portaria SJAM-DIREF 135/2025.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}