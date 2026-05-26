import {
  BarChart3,
  Building2,
  Clock3,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Painel institucional
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Bem-vindo ao SECP
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Usuário autenticado:{" "}
          <strong className="text-[var(--foreground)]">
            {session?.user.nome}
          </strong>{" "}
          • Perfil ativo:{" "}
          <strong className="text-[var(--foreground)]">
            {session?.user.perfilAtivo?.nome ?? "sem perfil ativo"}
          </strong>
        </p>
      </section>

      <RegraPortariaCard
        artigo="Arts. 6º, 8º, 16 e 20"
        titulo="Controle eletrônico, apuração e responsabilidades"
        descricao="O sistema apoiará o registro eletrônico de frequência, a apuração mensal da jornada, a homologação pela chefia e a gestão técnica do controle de frequência."
      />

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
        aria-label="Indicadores principais"
      >
        <DashboardCard
          titulo="Servidores"
          valor="0"
          descricao="Cadastro funcional será integrado ao SARH."
          icon={UsersRound}
        />

        <DashboardCard
          titulo="Unidades"
          valor="3"
          descricao="Estrutura inicial: SJAM, NUTEC, NUCGP e SECAD."
          icon={Building2}
        />

        <DashboardCard
          titulo="Marcações hoje"
          valor="0"
          descricao="Registro eletrônico será implementado no módulo de marcações."
          icon={Clock3}
        />

        <DashboardCard
          titulo="Homologações"
          valor="0"
          descricao="Fechamentos mensais pendentes aparecerão aqui."
          icon={ShieldCheck}
        />

        <DashboardCard
          titulo="Banco de horas"
          valor="0h"
          descricao="Saldo consolidado será calculado após apuração."
          icon={BarChart3}
        />
      </section>

      <section className="rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Próxima frente de implantação</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            "Perfis e permissões",
            "Unidades organizacionais",
            "Servidores e lotações",
            "Jornadas e escalas",
          ].map((item) => (
            <div
              key={item}
              className="rounded-xl border bg-(--muted) p-4 text-sm font-medium"
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
