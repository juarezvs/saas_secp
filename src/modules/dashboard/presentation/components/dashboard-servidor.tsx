import { Bell } from "lucide-react";

import { Badge } from "@/components/ui";
import { AcessoRapidoGrid } from "./acesso-rapido-grid";
import { AlertasEAvisosCard } from "./alertas-e-avisos-card";
import { DashboardMetricCard } from "./dashboard-metric-card";
import { FrequenciaMesResumo } from "./frequencia-mes-resumo";
import { GuiaRapidoCard } from "./guia-rapido-card";
import { MarcacoesDoDiaTimeline } from "./marcacoes-do-dia-timeline";
import { NextActionCard } from "./next-action-card";
import { dashboardServidorMock } from "../data/dashboard-servidor.mock";

type DashboardServidorProps = {
  primeiroNome: string;
};

export function DashboardServidor({ primeiroNome }: DashboardServidorProps) {
  const dados = dashboardServidorMock;

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <Badge className="bg-secp-blue-900 text-white">Perfil {dados.servidor.perfil}</Badge>
          <h1 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
            Bom dia, {primeiroNome}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {dados.servidor.dataExtenso} • {dados.servidor.horaReferencia} • {dados.servidor.unidade}
          </p>
        </div>

        <a
          href="/notificacoes"
          className="inline-flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Bell className="size-5 text-secp-blue-700" aria-hidden="true" />
          Ver notificações
          <Badge variant="regular">3</Badge>
        </a>
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_repeat(4,1fr)]">
        <NextActionCard {...dados.proximaAcao} />
        {dados.metricas.map((metrica) => (
          <DashboardMetricCard key={metrica.titulo} {...metrica} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr_1.2fr]">
        <MarcacoesDoDiaTimeline marcacoes={dados.marcacoes} />
        <AlertasEAvisosCard alertas={dados.alertas} />
        <FrequenciaMesResumo resumo={dados.frequenciaMes} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_18rem]">
        <AcessoRapidoGrid acessos={dados.acessos} />
        <GuiaRapidoCard regras={dados.regras} />
      </section>
    </div>
  );
}

