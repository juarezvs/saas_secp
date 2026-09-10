import { Bell, LayoutDashboard } from "lucide-react";

import { Badge } from "@/components/ui";
import { FavoritoPaginaButton } from "@/modules/favoritos/presentation/favorito-pagina-button";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao-utils";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";
import { AcessoRapidoGrid } from "./acesso-rapido-grid";
import { AlertasEAvisosCard } from "./alertas-e-avisos-card";
import { DashboardMetricCard } from "./dashboard-metric-card";
import { DashboardServidorRelogio } from "./dashboard-servidor-relogio";
import { FrequenciaMesResumo } from "./frequencia-mes-resumo";
import { MarcacoesDoDiaTimeline } from "./marcacoes-do-dia-timeline";
import { NextActionCard } from "./next-action-card";
import { SaudacaoServidor } from "./saudacao-servidor";
import {
  dashboardServidorConfig,
  type AlertaServidor,
  type MarcacaoDia,
  type MetricaServidor,
  type PrevisaoJornadaDia,
} from "../data/dashboard-servidor.config";
import type { FrequenciaMesServidorResumo } from "../../application/frequencia-mes-servidor.service";

type DashboardServidorProps = {
  primeiroNome: string;
  cabecalho?: Partial<typeof dashboardServidorConfig.servidor>;
  totalNotificacoes?: number;
  frequenciaMes?: FrequenciaMesServidorResumo;
  perfilAtivoCodigo?: string | null;
  permissoesPerfil?: string[];
  marcacoesDia?: MarcacaoDia[];
  previsaoJornadaDia?: PrevisaoJornadaDia | null;
  metricas?: MetricaServidor[];
  alertas?: AlertaServidor[];
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
  metricas,
  alertas,
}: DashboardServidorProps) {
  const podeRegistrarPontoPeloSecp = usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilAtivoCodigo,
    permissoesPerfil,
    PERMISSOES_ACESSO_REGISTRO_PONTO_SECP,
  );
  const podeRegistrarPontoWeb = usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilAtivoCodigo,
    permissoesPerfil,
    ["marcacoes:registrar-web:proprio"],
  );
  const podeRegistrarPontoFacial = usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilAtivoCodigo,
    permissoesPerfil,
    ["marcacoes:registrar-facial:proprio"],
  );
  const deveRegistrarPontoFacial =
    !podeRegistrarPontoWeb && podeRegistrarPontoFacial;
  const dados = {
    ...dashboardServidorConfig,
    servidor: {
      ...dashboardServidorConfig.servidor,
      ...cabecalho,
    },
    frequenciaMes: frequenciaMes ?? {
      mes: "Competência atual",
      diasUteis: 0,
      regular: 0,
      pendente: 0,
      falta: 0,
      recesso: 0,
      aguardando: 0,
    },
    metricas: metricas ?? [],
    alertas: alertas ?? [
      {
        tipo: "info" as const,
        titulo: "Sem dados apurados",
        descricao: "Ainda não há apuração registrada para a competência atual.",
      },
    ],
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
  const proximaAcao = deveRegistrarPontoFacial
    ? dados.proximaAcao
    : {
        ...dados.proximaAcao,
        titulo: "Registre sua marcação pelo sistema web autorizado.",
        descricao:
          "Use esta exceção apenas quando houver autorização específica para registro pelo SECP.",
      };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-[#004b93]/8 via-card to-card shadow-sm">
        <span
          className="absolute inset-x-0 top-0 h-1 bg-[#004b93]"
          aria-hidden="true"
        />
        <div className="flex flex-col justify-between gap-4 px-4 pb-4 pt-5 lg:flex-row lg:items-center">
          <div className="grid min-w-0 flex-1 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3">
            <div className="secp-theme-icon relative flex size-11 shrink-0 items-center justify-center rounded-lg ring-1 ring-[var(--border)]/70 shadow-sm">
              <LayoutDashboard className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
          <Badge className="bg-secp-blue-900 text-white">
            Perfil {dados.servidor.perfil}
          </Badge>
          <h1 className="mt-2 min-w-0 text-xl font-black tracking-normal text-foreground md:text-2xl">
            <SaudacaoServidor
              primeiroNome={primeiroNome}
              fusoHorario={dados.servidor.fusoHorario}
            />
          </h1>
          <DashboardServidorRelogio
            dataExtenso={dados.servidor.dataExtenso}
            horaReferencia={dados.servidor.horaReferencia}
            fusoHorario={dados.servidor.fusoHorario}
            unidade={dados.servidor.unidade}
          />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
            <FavoritoPaginaButton />
        <a
          href="/notificacoes"
          className="inline-flex shrink-0 items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Bell className="size-5 text-secp-blue-700" aria-hidden="true" />
          Ver notificações
          {totalNotificacoes > 0 && (
            <Badge variant="regular">
              {totalNotificacoes > 99 ? "99+" : totalNotificacoes}
            </Badge>
          )}
        </a>
          </div>
        </div>
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
