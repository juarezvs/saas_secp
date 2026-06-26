import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  Fingerprint,
  Hourglass,
  Landmark,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

const modulos = [
  {
    titulo: "Ponto eletrônico",
    descricao:
      "Registro web, biometria, equipamentos e marcações importadas com contexto completo.",
    icon: Fingerprint,
  },
  {
    titulo: "Espelho e apuração",
    descricao:
      "Jornada, fuso, solicitações e ocorrências consolidadas por competência.",
    icon: FileCheck2,
  },
  {
    titulo: "Banco de horas",
    descricao:
      "Créditos, débitos, compensações e limites refletidos após cada mudança relevante.",
    icon: Hourglass,
  },
  {
    titulo: "Regra por órgão",
    descricao:
      "Configuração independente de tolerâncias, prazos e regulamentação do ponto.",
    icon: SlidersHorizontal,
  },
];

const indicadores = [
  { valor: "Multi-órgãos", rotulo: "regras e fusos isolados" },
  { valor: "Auditoria", rotulo: "ações sensíveis rastreadas" },
  { valor: "Acessível", rotulo: "preferências por usuário" },
];

const fluxo = [
  { titulo: "Registrar", icon: Clock3 },
  { titulo: "Apurar", icon: CalendarCheck2 },
  { titulo: "Solicitar", icon: ClipboardList },
  { titulo: "Homologar", icon: CheckCircle2 },
  { titulo: "Relatar", icon: BarChart3 },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section
        className="relative flex min-h-[82vh] flex-col overflow-hidden bg-slate-950 text-white"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(2, 6, 23, 0.94) 0%, rgba(15, 23, 42, 0.74) 52%, rgba(15, 23, 42, 0.30) 100%), url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=80')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <header className="relative z-10 border-b border-white/15">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-md bg-white text-sm font-black text-blue-950">
                SE
              </div>
              <div>
                <p className="text-xs font-black uppercase text-cyan-100">
                  Justiça Federal
                </p>
                <p className="text-xl font-black">SECP</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-bold text-slate-100 md:flex">
              <a href="#modulos" className="transition hover:text-cyan-200">
                Módulos
              </a>
              <a href="#multi-orgaos" className="transition hover:text-cyan-200">
                Multi-órgãos
              </a>
              <a href="#governanca" className="transition hover:text-cyan-200">
                Governança
              </a>
            </nav>

            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-black text-blue-950 transition hover:bg-cyan-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Entrar
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-14">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-3 rounded-md border border-cyan-200/30 bg-cyan-100/10 px-4 py-2 text-sm font-bold text-cyan-50">
              <Landmark className="size-4" aria-hidden="true" />
              Sistema Eletrônico de Controle de Ponto
            </div>

            <h1 className="mt-7 max-w-3xl text-5xl font-black tracking-normal text-white md:text-7xl">
              SECP
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-100 md:text-xl">
              Plataforma institucional para frequência funcional, construída
              para operar com segurança, acessibilidade, fuso correto e regras
              independentes por órgão.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cyan-300 px-6 text-sm font-black text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100"
              >
                Acessar plataforma
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                href="#modulos"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/45 px-6 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Conhecer solução
              </a>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/15 bg-slate-950/35 px-6 py-5 backdrop-blur-sm">
          <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-3">
            {indicadores.map((item) => (
              <div key={item.valor} className="flex items-center gap-3">
                <CheckCircle2
                  className="size-5 shrink-0 text-emerald-300"
                  aria-hidden="true"
                />
                <p className="text-sm text-slate-100">
                  <span className="font-black">{item.valor}</span>{" "}
                  <span className="text-slate-300">{item.rotulo}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modulos" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase text-blue-900">
                Operação completa
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-normal text-slate-950 md:text-4xl">
                Do registro à homologação, tudo conversa com a mesma base.
              </h2>
            </div>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-950 px-5 text-sm font-black text-white transition hover:bg-blue-900"
            >
              Entrar no SECP
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modulos.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.titulo}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex size-12 items-center justify-center rounded-md bg-blue-950 text-white">
                    <Icon className="size-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-base font-black text-slate-950">
                    {item.titulo}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.descricao}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="multi-orgaos"
        className="border-y border-slate-200 bg-slate-100 px-6 py-16"
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-blue-900">
              Multi-órgãos
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-normal text-slate-950 md:text-4xl">
              Cada órgão opera com sua estrutura, seu fuso e sua norma.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              O SECP separa unidades, servidores, equipamentos, calendários e
              regulamentações por órgão. Ao processar uma marcação, o sistema
              resolve o vínculo funcional do servidor e aplica apenas as regras
              do órgão impactado.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Órgãos e unidades", icon: Building2 },
              { label: "Fuso por localidade", icon: Clock3 },
              { label: "Regulamentação", icon: SlidersHorizontal },
              { label: "Auditoria segregada", icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex min-h-24 items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-blue-950">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-black text-slate-800">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="governanca" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase text-blue-900">
              Governança de ponta a ponta
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-normal text-slate-950 md:text-4xl">
              Um ciclo de frequência desenhado para decisão institucional.
            </h2>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-5">
            {fluxo.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.titulo}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Icon className="size-5 text-blue-900" aria-hidden="true" />
                  </div>
                  <p className="mt-8 text-sm font-black text-slate-900">
                    {item.titulo}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
