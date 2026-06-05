import Link from "next/link";
import {
  Accessibility,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Hourglass,
  ShieldCheck,
} from "lucide-react";

const funcionalidades = [
  { titulo: "Registro", descricao: "Registro eletrônico de frequência com orientação da próxima ação.", icon: Clock },
  { titulo: "Banco de horas", descricao: "Acompanhamento de créditos, débitos, limites e prazos.", icon: Hourglass },
  { titulo: "Solicitações", descricao: "Fluxos guiados para ajuste, compensação e justificativas.", icon: ClipboardList },
  { titulo: "Homologação", descricao: "Fila de decisão para chefias com pendências priorizadas.", icon: CheckCircle2 },
  { titulo: "Auditoria", descricao: "Rastreabilidade visual das operações e decisões institucionais.", icon: ShieldCheck },
  { titulo: "Relatórios", descricao: "Espelhos, extratos e relatórios preparados para exportação.", icon: BarChart3 },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-secp-blue-900 text-sm font-black text-white">
              SE
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-secp-blue-700">Justiça Federal do Amazonas</p>
              <p className="text-xl font-black">SECP</p>
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-md bg-secp-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-secp-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase text-secp-blue-700">Sistema Eletrônico de Controle de Ponto</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-normal md:text-5xl">
            SECP
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            Plataforma institucional da Justiça Federal para registro, acompanhamento,
            solicitações, banco de horas, homologação e auditoria da frequência funcional.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-md bg-secp-blue-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-secp-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Entrar com matrícula da rede
            </Link>
            <a
              href="#funcionalidades"
              className="rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Conhecer funcionalidades
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-card">
          <div className="rounded-lg secp-institutional-gradient p-6 text-white">
            <Accessibility className="size-8" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">Governança digital da frequência</h2>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Interface auto-instrucional, acessível e preparada para conformidade com a Portaria SJAM-DIREF 135/2025.
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["Acessibilidade", "Segurança", "Rastreabilidade", "Conformidade"].map((item) => (
              <div key={item} className="rounded-md bg-muted p-3 text-sm font-semibold">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="border-t border-border bg-card px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold">Funcionalidades principais</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {funcionalidades.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.titulo} className="rounded-lg border border-border bg-background p-5">
                  <Icon className="size-6 text-secp-blue-700" aria-hidden="true" />
                  <h3 className="mt-4 font-bold">{item.titulo}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.descricao}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

