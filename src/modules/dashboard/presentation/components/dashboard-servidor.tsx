import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao-utils";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";
import { AcessoRapidoGrid } from "./acesso-rapido-grid";
import { AlertasEAvisosCard } from "./alertas-e-avisos-card";
import { FrequenciaMesResumo } from "./frequencia-mes-resumo";
import { MarcacoesDoDiaTimeline } from "./marcacoes-do-dia-timeline";
import { DashboardServidorRelogio } from "./dashboard-servidor-relogio";
import { SaudacaoServidor, SaudacaoServidorIcon } from "./saudacao-servidor";
import { TempoTrabalhadoTempoReal } from "./tempo-trabalhado-tempo-real";
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
  const cardsTopo = montarCardsTopo(dados.metricas, previsaoJornadaDia);

  return (
    <div className="space-y-2">
      <section className="rounded-xl border border-slate-200 bg-[var(--card)] px-3 py-2.5 text-[var(--card-foreground)] shadow-sm dark:border-slate-800">
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-300">
              <SaudacaoServidorIcon fusoHorario={dados.servidor.fusoHorario} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="truncate text-lg font-black tracking-normal text-blue-950 md:text-xl dark:text-blue-100">
                  <SaudacaoServidor
                    primeiroNome={primeiroNome}
                    fusoHorario={dados.servidor.fusoHorario}
                  />
                </h1>
                <Badge className="shrink-0 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                  Perfil {dados.servidor.perfil}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <DashboardServidorRelogio
                  dataExtenso={dados.servidor.dataExtenso}
                  horaReferencia={dados.servidor.horaReferencia}
                  fusoHorario={dados.servidor.fusoHorario}
                />
                <p className="inline-flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{dados.servidor.unidade}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {cardsTopo.map((card) => (
          <CardResumoServidor key={card.titulo} {...card} />
        ))}
      </section>

      {false && podeRegistrarPontoPeloSecp ? (
        <section className="rounded-xl border border-blue-100 bg-blue-950 p-2.5 text-white shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/65">
                Próxima ação recomendada
              </p>
              <h2 className="mt-1 text-base font-black">
                {proximaAcao.titulo}
              </h2>
              <p className="mt-1 text-sm text-white/75">
                {proximaAcao.descricao}
              </p>
            </div>
            <Link
              href={proximaAcao.href}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-blue-800 shadow-sm hover:bg-blue-50"
            >
              Registrar ponto
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-2 xl:grid-cols-[minmax(19rem,0.86fr)_minmax(0,1.34fr)_minmax(19rem,1fr)]">
        <MarcacoesDoDiaTimeline marcacoes={dados.marcacoes} />
        <MinhaJornadaHoje previsao={previsaoJornadaDia} />
        <AcessoRapidoGrid acessos={acessos} />
      </section>

      <section className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(19rem,0.78fr)]">
        <FrequenciaMesResumo resumo={dados.frequenciaMes} />
        <AlertasEAvisosCard alertas={dados.alertas} />
        <ProximasAcoes />
      </section>
    </div>
  );
}

function montarCardsTopo(
  metricas: MetricaServidor[],
  previsao?: PrevisaoJornadaDia | null,
) {
  const proximaMarcacao =
    previsao?.horarios.at(-1)?.horario ?? previsao?.saidaEstimada ?? "--:--";
  const cardsMetricas = metricas
    .filter((metrica) => normalizarTextoCard(metrica.titulo) !== "JORNADA HOJE")
    .slice(0, 3)
    .map((metrica) => ({
      titulo: metrica.titulo,
      valor: metrica.valor,
      descricao: metrica.descricao,
      icon: metrica.icon,
      tempoReal: metrica.tempoReal,
      tone:
        metrica.variante === "success"
          ? ("green" as const)
          : metrica.variante === "warning"
            ? ("orange" as const)
            : ("blue" as const),
      href:
        metrica.titulo === "Banco de horas" ? "/banco-horas" : "/espelho-ponto",
    }));

  return [
    {
      titulo: "Jornada prevista hoje",
      valor: previsao?.carga ?? "0h",
      descricao: "Jornada diária",
      icon: CalendarDays,
      tone: "blue" as const,
      href: "/espelho-ponto",
    },
    ...cardsMetricas,
    {
      titulo: "Próxima marcação",
      valor:
        proximaMarcacao === "--:--"
          ? "Sem previsão"
          : `Saída ${proximaMarcacao}`,
      descricao: previsao?.saidaEstimada
        ? `Saída estimada ${previsao.saidaEstimada}`
        : "Acompanhe sua jornada",
      icon: Clock3,
      tone: "blue" as const,
      href: "/marcacoes",
    },
  ].slice(0, 5);
}

function CardResumoServidor({
  titulo,
  valor,
  descricao,
  icon: Icon,
  tone,
  href,
  tempoReal,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "orange";
  href: string;
  tempoReal?: {
    inicioIso: string;
    minutosBase: number;
  };
}) {
  const ehTrabalhadoHoje = normalizarTextoCard(titulo) === "TRABALHADO HOJE";
  const destacarSaidaEstimada =
    normalizarTextoCard(titulo) === "PROXIMA MARCACAO" &&
    normalizarTextoCard(descricao).includes("SAIDA ESTIMADA");
  const classes = classesCardResumo(titulo, tone);
  const valorFormatado =
    ehTrabalhadoHoje && /^\d{2}:\d{2}$/.test(valor) ? `${valor}:00` : valor;

  return (
    <Link
      href={href}
      className={`group flex min-h-[88px] items-center gap-3 rounded-xl border p-3 shadow-sm transition hover:border-blue-100 dark:border-slate-800 ${classes.card}`}
    >
      <span
        className={`grid size-12 place-items-center rounded-xl ${classes.icon}`}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase text-slate-500">
          {titulo}
        </span>
        <span className="mt-0.5 block text-xl font-black leading-tight text-blue-950 dark:text-blue-100">
          {tempoReal ? (
            <TempoTrabalhadoTempoReal
              inicioIso={tempoReal.inicioIso}
              minutosBase={tempoReal.minutosBase}
              valorInicial={valorFormatado}
            />
          ) : ehTrabalhadoHoje ? (
            <TempoComSegundosMenores valor={valorFormatado} />
          ) : (
            valorFormatado
          )}
        </span>
        <span
          className={[
            "mt-0.5 block truncate text-xs font-medium",
            destacarSaidaEstimada
              ? "w-fit rounded-full bg-blue-100 px-2 py-0.5 font-bold text-blue-800"
              : "text-slate-500",
          ].join(" ")}
        >
          {descricao}
        </span>
      </span>
      <ArrowRight
        className="size-4 text-blue-700 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"
        aria-hidden="true"
      />
    </Link>
  );
}

function TempoComSegundosMenores({ valor }: { valor: string }) {
  const [horasMinutos, segundos] = valor.split(/:(?=\d{2}$)/);

  return (
    <>
      {horasMinutos}
      {segundos ? (
        <span className="align-baseline text-[0.7em]">:{segundos}</span>
      ) : null}
    </>
  );
}

function classesCardResumo(titulo: string, tone: "blue" | "green" | "orange") {
  const tituloNormalizado = normalizarTextoCard(titulo);

  if (tituloNormalizado === "TRABALHADO HOJE") {
    return {
      card: "border-emerald-100 bg-emerald-50/45 hover:bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
    };
  }

  if (tituloNormalizado === "BANCO DE HORAS") {
    return {
      card: "border-violet-100 bg-violet-50/45 hover:bg-violet-50",
      icon: "bg-violet-100 text-violet-700",
    };
  }

  if (tituloNormalizado === "PENDENCIAS") {
    return {
      card: "border-orange-100 bg-orange-50/45 hover:bg-orange-50",
      icon: "bg-orange-100 text-orange-700",
    };
  }

  if (tone === "green") {
    return {
      card: "border-emerald-100 bg-emerald-50/45 hover:bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
    };
  }

  if (tone === "orange") {
    return {
      card: "border-orange-100 bg-orange-50/45 hover:bg-orange-50",
      icon: "bg-orange-100 text-orange-700",
    };
  }

  return {
    card: "border-blue-100 bg-blue-50/45 hover:bg-blue-50",
    icon: "bg-blue-100 text-blue-700",
  };
}

function normalizarTextoCard(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function MinhaJornadaHoje({
  previsao,
}: {
  previsao?: PrevisaoJornadaDia | null;
}) {
  const entrada = previsao?.horarios[0]?.horario ?? "--:--";
  const saida = previsao?.horarios.at(-1)?.horario ?? "--:--";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-blue-950 dark:text-blue-100">
          <Clock3 className="size-4 text-blue-700" aria-hidden="true" />
          Minha jornada hoje
        </h2>
        <Link href="/marcacoes" className="text-xs font-bold text-blue-700">
          Detalhes do dia
        </Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <ResumoJornada label="Entrada prevista" value={entrada} />
        <ResumoJornada label="Saída prevista" value={saida} />
        <ResumoJornada
          label="Jornada prevista"
          value={previsao?.carga ?? "0h"}
        />
        <ResumoJornada
          label="Saída estimada"
          value={previsao?.saidaEstimada ?? saida}
        />
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full w-4/5 rounded-full bg-blue-700" />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
        <span>Progresso da jornada de hoje (05:37:45 de 07:00)</span>
        <span className="text-blue-700">80%</span>
      </div>
      <div className="mt-2 flex justify-between px-1 text-[10px] font-medium text-slate-500">
        {["08:00", "10:00", "12:00", "14:00", "15:00"].map((hora) => (
          <span key={hora}>{hora}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-[1fr_0.62fr_1fr_0.3fr] overflow-hidden rounded-xl border border-slate-100 text-center text-xs font-semibold">
        <span className="bg-emerald-100 px-2 py-2.5 text-emerald-700">
          Trabalhando
        </span>
        <span className="bg-red-50 px-2 py-2.5 text-red-700">Intervalo</span>
        <span className="bg-emerald-100 px-2 py-2.5 text-emerald-700">
          Trabalhando
        </span>
        <span
          className="px-2 py-2.5 text-slate-500"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg,#e2e8f0 0,#e2e8f0 2px,#f8fafc 2px,#f8fafc 6px)",
          }}
        >
          -
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[10px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-500" />
          Período trabalhado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-red-500" />
          Intervalo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-slate-300" />
          Aguardando
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-slate-200" />
          Fora da jornada
        </span>
      </div>
    </section>
  );
}

function ResumoJornada({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-blue-950 dark:text-blue-100">
        {value}
      </p>
    </div>
  );
}

function ProximasAcoes() {
  const acoes = [
    {
      label: "Regularizar marcação pendente",
      href: "/solicitacoes/nova",
      icon: FileText,
    },
    { label: "Verificar banco de horas", href: "/banco-horas", icon: Clock3 },
    { label: "Enviar solicitações", href: "/solicitacoes", icon: CheckCircle2 },
    {
      label: "Consultar espelho do mês",
      href: "/espelho-ponto",
      icon: CalendarDays,
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-sm font-black text-blue-950 dark:text-blue-100">
        Próximas ações
      </h2>
      <div className="mt-2 grid gap-1.5">
        {acoes.map((acao) => {
          const Icon = acao.icon;

          return (
            <Link
              key={acao.label}
              href={acao.href}
              className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs font-bold text-blue-950 hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-100"
            >
              <Icon className="size-5 text-blue-700" aria-hidden="true" />
              <span className="min-w-0 flex-1">{acao.label}</span>
              <ArrowRight className="size-4 text-blue-700" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
