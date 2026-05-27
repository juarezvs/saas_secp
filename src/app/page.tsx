import Link from "next/link";
import { Clock3, ShieldCheck, BarChart3, Accessibility } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-900">
              Justiça Federal do Amazonas
            </p>
            <h1 className="text-xl font-black">SECP</h1>
          </div>

          <Link
            href="/login"
            className="rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            Acessar sistema
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-900">
            Controle eletrônico de frequência
          </p>

          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Sistema Eletrônico de Controle de Ponto da JFAM
          </h2>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
            Plataforma institucional para registro eletrônico de frequência,
            banco de horas, solicitações, homologações, relatórios e auditoria,
            alinhada à Portaria SJAM-DIREF 135/2025.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-md bg-blue-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              Entrar com matrícula
            </Link>

            <a
              href="#funcionalidades"
              className="rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Conhecer funcionalidades
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4">
            <FeatureCard
              icon={Clock3}
              titulo="Registro de ponto"
              descricao="Entrada, saída, intervalo e retorno com classificação automática."
            />

            <FeatureCard
              icon={BarChart3}
              titulo="Banco de horas"
              descricao="Controle de créditos, débitos, compensações, limites e prazos."
            />

            <FeatureCard
              icon={ShieldCheck}
              titulo="Homologação"
              descricao="Validação mensal pela chefia e emissão de boletins."
            />

            <FeatureCard
              icon={Accessibility}
              titulo="Acessibilidade"
              descricao="VLibras, tema claro/escuro, ajuste de fonte e suporte à leitura assistiva."
            />
          </div>
        </div>
      </section>

      <section
        id="funcionalidades"
        className="border-t border-slate-200 bg-white px-6 py-14"
      >
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black text-slate-950">
            Funcionalidades principais
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "Cadastro de servidores e unidades",
              "Jornadas e escalas",
              "Registro eletrônico de frequência",
              "Solicitações e aprovações",
              "Homologação mensal",
              "Relatórios e auditoria",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-800"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

type FeatureCardProps = {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  titulo: string;
  descricao: string;
};

function FeatureCard({ icon: Icon, titulo, descricao }: FeatureCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex gap-4">
        <div className="rounded-lg bg-blue-900 p-3 text-white">
          <Icon className="size-5" aria-hidden />
        </div>

        <div>
          <h3 className="font-bold text-slate-950">{titulo}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{descricao}</p>
        </div>
      </div>
    </article>
  );
}
