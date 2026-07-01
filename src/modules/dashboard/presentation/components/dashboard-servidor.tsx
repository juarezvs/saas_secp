import { Bell } from "lucide-react";

import { Badge } from "@/components/ui";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao-utils";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";
import { AcessoRapidoGrid } from "./acesso-rapido-grid";
import { AlertasEAvisosCard } from "./alertas-e-avisos-card";
import { DashboardMetricCard } from "./dashboard-metric-card";
import { DashboardServidorRelogio } from "./dashboard-servidor-relogio";
import { FrequenciaMesResumo } from "./frequencia-mes-resumo";
import { MarcacoesDoDiaTimeline } from "./marcacoes-do-dia-timeline";
import { NextActionCard } from "./next-action-card";
import {
  dashboardServidorMock,
  type MarcacaoDia,
  type PrevisaoJornadaDia,
} from "../data/dashboard-servidor.mock";
import type { FrequenciaMesServidorResumo } from "../../application/frequencia-mes-servidor.service";

type DashboardServidorProps = {
  primeiroNome: string;
  cabecalho?: Partial<typeof dashboardServidorMock.servidor>;
  totalNotificacoes?: number;
  frequenciaMes?: FrequenciaMesServidorResumo;
  perfilAtivoCodigo?: string | null;
  permissoesPerfil?: string[];
  marcacoesDia?: MarcacaoDia[];
  previsaoJornadaDia?: PrevisaoJornadaDia | null;
};

export function DashboardServidor({
  primeiroNome,
  cabecalho,
  totalNotificacoes = 0,
  frequenciaMes,
  perfilAtivoCodigo,
  permissoesPerfil = [],
  marcacoesDia = [],
  previsaoJornadaDia = null,
}: DashboardServidorProps) {
  const podeRegistrarPontoPeloSecp = usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilAtivoCodigo,
    permissoesPerfil,
    PERMISSOES_ACESSO_REGISTRO_PONTO_SECP,
  );
  const podeRegistrarPontoFacial = usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilAtivoCodigo,
    permissoesPerfil,
    ["marcacoes:registrar-facial:proprio"],
  );
  const dados = {
    ...dashboardServidorMock,
    servidor: {
      ...dashboardServidorMock.servidor,
      ...cabecalho,
    },
    frequenciaMes: frequenciaMes ?? dashboardServidorMock.frequenciaMes,
    marcacoes: marcacoesDia,
  };
  const acessos = dados.acessos.filter((acesso) => {
    if (!acesso.permissoes || acesso.permissoes.length === 0) {
      return true;
    }

    return usuarioPossuiAlgumaPermissaoNoPerfil(
      perfilAtivoCodigo,
      permissoesPerfil,
      acesso.permissoes,
    );
  });
  const proximaAcao = podeRegistrarPontoFacial
    ? dados.proximaAcao
    : {
        ...dados.proximaAcao,
        titulo: "Registre sua marcação pelo sistema web autorizado.",
        descricao:
          "Use esta exceção apenas quando houver autorização específica para registro pelo SECP.",
      };

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <Badge className="bg-secp-blue-900 text-white">
            Perfil {dados.servidor.perfil}
          </Badge>
          <h1 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
            Bom dia, {primeiroNome}
          </h1>
          <DashboardServidorRelogio
            dataExtenso={dados.servidor.dataExtenso}
            horaReferencia={dados.servidor.horaReferencia}
            fusoHorario={dados.servidor.fusoHorario}
            unidade={dados.servidor.unidade}
          />
        </div>

        <a
          href="/notificacoes"
          className="inline-flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Bell className="size-5 text-secp-blue-700" aria-hidden="true" />
          Ver notificações
          {totalNotificacoes > 0 && (
            <Badge variant="regular">
              {totalNotificacoes > 99 ? "99+" : totalNotificacoes}
            </Badge>
          )}
        </a>
      </section>

      <section
        className={
          podeRegistrarPontoPeloSecp
            ? "grid gap-3 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.65fr)]"
            : "grid gap-3"
        }
      >
        {podeRegistrarPontoPeloSecp && <NextActionCard {...proximaAcao} />}
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dados.metricas.map((metrica) => (
              <DashboardMetricCard key={metrica.titulo} {...metrica} />
            ))}
          </div>
          <AcessoRapidoGrid acessos={acessos} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.38fr]">
        <MarcacoesDoDiaTimeline
          marcacoes={dados.marcacoes}
          previsao={previsaoJornadaDia}
        />
        <div className="grid gap-3">
          <FrequenciaMesResumo resumo={dados.frequenciaMes} />
          <AlertasEAvisosCard alertas={dados.alertas} />
        </div>
      </section>

    </div>
  );
}
