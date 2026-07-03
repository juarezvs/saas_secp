import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Gauge,
  Server,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import {
  SecpChartCard,
  SecpComposedChart,
  SecpComparativeHorizontalBarChart,
  SecpHorizontalBarChart,
  SecpKpiCard,
  SecpLineChart,
  SecpStackedHorizontalBarChart,
  type SecpLineSerie,
} from "@/components/charts";
import type { ResultadoPermissao } from "@/modules/auth/application/services/permissao.service";
import type {
  PainelExecutivoDados,
  SerieMensalIndicadores,
  SerieDupla,
  SerieValor,
} from "@/modules/painel-executivo/infrastructure/repositories/painel-executivo.repository";
import {
  PERMISSAO_PAINEL_EXECUTIVO,
  PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
  paineisExecutivos,
  type PainelExecutivoSecao,
} from "./painel-executivo-data";

type PainelExecutivoPageProps = {
  painel: PainelExecutivoSecao;
  permissao: ResultadoPermissao;
  dados: PainelExecutivoDados;
};

const CORES = [
  "#1d4ed8",
  "#059669",
  "#ea580c",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#4f46e5",
  "#65a30d",
];

function podeVerPainel(
  painel: PainelExecutivoSecao,
  permissoes: string[],
  perfilCodigo?: string,
) {
  if (!painel.permissao) return true;

  return (
    perfilCodigo === "MASTER" ||
    perfilCodigo === "ADMIN" ||
    permissoes.includes(PERMISSAO_PAINEL_EXECUTIVO) ||
    (painel.slug === "equipamentos-de-ponto" &&
      permissoes.includes(PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS)) ||
    permissoes.includes(painel.permissao)
  );
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(valor);
}

function formatarTextoPainel(valor: string) {
  return valor
    .replaceAll("Pendencias", "Pend\u00eancias")
    .replaceAll("pendencias", "pend\u00eancias")
    .replaceAll("Pendencia", "Pend\u00eancia")
    .replaceAll("pendencia", "pend\u00eancia")
    .replaceAll("Frequencia", "Frequ\u00eancia")
    .replaceAll("frequencia", "frequ\u00eancia")
    .replaceAll("Homologacao", "Homologa\u00e7\u00e3o")
    .replaceAll("homologacao", "homologa\u00e7\u00e3o")
    .replaceAll("Ocorrencias", "Ocorr\u00eancias")
    .replaceAll("ocorrencias", "ocorr\u00eancias")
    .replaceAll("Marcacoes", "Marca\u00e7\u00f5es")
    .replaceAll("marcacoes", "marca\u00e7\u00f5es")
    .replaceAll("Inconsistencias", "Inconsist\u00eancias")
    .replaceAll("inconsistencias", "inconsist\u00eancias")
    .replaceAll("Relatorios", "Relat\u00f3rios")
    .replaceAll("relatorios", "relat\u00f3rios")
    .replaceAll("Paineis", "Pain\u00e9is")
    .replaceAll("paineis", "pain\u00e9is")
    .replaceAll("Graficos", "Gr\u00e1ficos")
    .replaceAll("graficos", "gr\u00e1ficos")
    .replaceAll("Gestao", "Gest\u00e3o")
    .replaceAll("Governanca", "Governan\u00e7a")
    .replaceAll("Inteligencia", "Intelig\u00eancia")
    .replaceAll("Critica", "Cr\u00edtica")
    .replaceAll("Critico", "Cr\u00edtico")
    .replaceAll("Media", "M\u00e9dia")
    .replaceAll("Atencao", "Aten\u00e7\u00e3o")
    .replaceAll("Maxima", "M\u00e1xima")
    .replaceAll("Manutencao", "Manuten\u00e7\u00e3o")
    .replaceAll("sincronizacao", "sincroniza\u00e7\u00e3o")
    .replaceAll("comunicacao", "comunica\u00e7\u00e3o")
    .replaceAll("Acao", "A\u00e7\u00e3o")
    .replaceAll("acao", "a\u00e7\u00e3o")
    .replaceAll("mes", "m\u00eas");
}
function totalSerie(dados: SerieValor[]) {
  return dados.reduce((total, item) => total + item.valor, 0);
}

function ultimoItem<T>(itens: T[]) {
  return itens[itens.length - 1];
}

function serieVazia(dados: SerieValor[] | SerieDupla[]) {
  return dados.length === 0 || dados.every((item) => item.valor === 0);
}

function EmptyChart() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-4 text-center text-sm font-medium text-muted-foreground">
      Sem dados registrados para a competência selecionada.
    </div>
  );
}

function MetricCard({
  label,
  valor,
  detalhe,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  valor: string | number;
  detalhe: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "orange" | "red";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
    green:
      "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    orange:
      "bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
    red: "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200",
  };

  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {label}
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-none">
            {typeof valor === "number" ? formatarNumero(valor) : valor}
          </h2>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {detalhe}
          </p>
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function DonutChart({ titulo, dados }: { titulo: string; dados: SerieValor[] }) {
  if (serieVazia(dados)) return <ChartPanel titulo={titulo} chart={<EmptyChart />} />;

  const total = totalSerie(dados);
  const fatias = dados.reduce<Array<{ cor: string; inicio: number; fim: number }>>(
    (acc, item, index) => {
      const inicio = acc[index - 1]?.fim ?? 0;
      const fatia = total > 0 ? (item.valor / total) * 100 : 0;

      return [
        ...acc,
        {
          cor: CORES[index % CORES.length],
          inicio,
          fim: inicio + fatia,
        },
      ];
    },
    [],
  );
  const gradiente = fatias
    .map((fatia) => `${fatia.cor} ${fatia.inicio}% ${fatia.fim}%`)
    .join(", ");

  return (
    <ChartPanel
      titulo={titulo}
      chart={
        <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
          <div className="relative mx-auto size-44">
            <div
              className="size-44 rounded-full"
              style={{ background: `conic-gradient(${gradiente})` }}
            />
            <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-card text-center">
              <span className="text-2xl font-bold">{formatarNumero(total)}</span>
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                registros
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            {dados.map((item, index) => (
              <div
                key={item.label}
                className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-center gap-2 text-sm"
              >
                <span
                  className="size-3 rounded-sm"
                  style={{ backgroundColor: CORES[index % CORES.length] }}
                />
                <span className="truncate font-medium">{item.label}</span>
                <span className="font-bold">{formatarNumero(item.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

function HorizontalBarChart({
  titulo,
  dados,
  sufixo = "",
}: {
  titulo: string;
  dados: SerieValor[];
  sufixo?: string;
}) {
  if (serieVazia(dados)) return <ChartPanel titulo={titulo} chart={<EmptyChart />} />;

  const maior = Math.max(...dados.map((item) => item.valor), 1);

  return (
    <ChartPanel
      titulo={titulo}
      chart={
        <div className="grid gap-3">
          {dados.map((item, index) => (
            <div key={item.label} className="grid gap-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-semibold">{item.label}</span>
                <span className="text-muted-foreground">
                  {formatarNumero(item.valor)}
                  {sufixo}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, (item.valor / maior) * 100)}%`,
                    backgroundColor: CORES[index % CORES.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}

function LineAreaChart({ titulo, dados }: { titulo: string; dados: SerieDupla[] }) {
  if (serieVazia(dados)) return <ChartPanel titulo={titulo} chart={<EmptyChart />} />;

  const largura = 620;
  const altura = 230;
  const margem = { top: 14, right: 20, bottom: 28, left: 34 };
  const chartW = largura - margem.left - margem.right;
  const chartH = altura - margem.top - margem.bottom;
  const maior = Math.max(
    ...dados.flatMap((item) => [item.valor, item.valorSecundario]),
    1,
  );

  function ponto(valor: number, index: number) {
    const x =
      margem.left + (dados.length === 1 ? chartW / 2 : (index / (dados.length - 1)) * chartW);
    const y = margem.top + chartH - (valor / maior) * chartH;

    return { x, y };
  }

  const linhaRegular = dados
    .map((item, index) => ponto(item.valor, index))
    .map((item) => `${item.x},${item.y}`)
    .join(" ");
  const linhaPendências = dados
    .map((item, index) => ponto(item.valorSecundario, index))
    .map((item) => `${item.x},${item.y}`)
    .join(" ");

  return (
    <ChartPanel
      titulo={titulo}
      chart={
        <div className="grid gap-3">
          <svg
            viewBox={`0 0 ${largura} ${altura}`}
            role="img"
            aria-label={titulo}
            className="h-64 w-full"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const y = margem.top + chartH - tick * chartH;

              return (
                <g key={tick}>
                  <line
                    x1={margem.left}
                    x2={largura - margem.right}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-border"
                  />
                  <text
                    x={margem.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {Math.round(maior * tick)}
                  </text>
                </g>
              );
            })}
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={linhaRegular}
            />
            <polyline
              fill="none"
              stroke="#dc2626"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={linhaPendências}
            />
            {dados.map((item, index) => {
              const regular = ponto(item.valor, index);
              const pendencia = ponto(item.valorSecundario, index);

              return (
                <g key={item.label}>
                  <circle cx={regular.x} cy={regular.y} r="3" fill="#059669" />
                  <circle cx={pendencia.x} cy={pendencia.y} r="3" fill="#dc2626" />
                  {index % 3 === 0 && (
                    <text
                      x={regular.x}
                      y={altura - 8}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {item.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-2">
              <span className="size-3 rounded-sm bg-emerald-600" />
              Regulares
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-3 rounded-sm bg-red-600" />
              Com pendência
            </span>
          </div>
        </div>
      }
    />
  );
}

function ChartPanel({ titulo, chart }: { titulo: string; chart: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-card">
      <h2 className="text-base font-bold">{titulo}</h2>
      <div className="mt-4">{chart}</div>
    </div>
  );
}

type KpiExecutivo = {
  chave: keyof Omit<SerieMensalIndicadores, "label" | "competencia">;
  label: string;
  detalhe: string;
  icon: LucideIcon;
  cor: string;
  melhor: "maior" | "menor";
};

const KPIS_EXECUTIVOS: KpiExecutivo[] = [
  {
    chave: "pontualidade",
    label: "Pontualidade",
    detalhe: "sem atraso relevante",
    icon: Clock3,
    cor: "#1d4ed8",
    melhor: "maior",
  },
  {
    chave: "absenteismo",
    label: "Absenteismo",
    detalhe: "ausencias nao justificadas",
    icon: AlertTriangle,
    cor: "#dc2626",
    melhor: "menor",
  },
  {
    chave: "espelhosHomologados",
    label: "Espelhos homologados",
    detalhe: "homologados sobre esperados",
    icon: CheckCircle2,
    cor: "#059669",
    melhor: "maior",
  },
  {
    chave: "pendencias",
    label: "Pendências",
    detalhe: "justificativas abertas",
    icon: AlertTriangle,
    cor: "#ea580c",
    melhor: "menor",
  },
  {
    chave: "bancoHorasCritico",
    label: "Banco de horas crítico",
    detalhe: "fora da faixa tolerada",
    icon: Gauge,
    cor: "#7c3aed",
    melhor: "menor",
  },
  {
    chave: "marcacoesManuaisWeb",
    label: "Marcações manuais/web",
    detalhe: "nao biometricas",
    icon: Activity,
    cor: "#0891b2",
    melhor: "menor",
  },
  {
    chave: "inconsistencias",
    label: "Inconsistências",
    detalhe: "batida, falta ou jornada invalida",
    icon: Server,
    cor: "#4f46e5",
    melhor: "menor",
  },
];

function classificarKpi(valor: number, melhor: "maior" | "menor") {
  if (melhor === "maior") {
    if (valor >= 90) return "green";
    if (valor >= 75) return "orange";
    return "red";
  }

  if (valor <= 5) return "green";
  if (valor <= 15) return "orange";
  return "red";
}

function variacaoKpi(
  dados: SerieMensalIndicadores[],
  chave: KpiExecutivo["chave"],
) {
  const atual = ultimoItem(dados)?.[chave] ?? 0;
  const anterior = dados.length > 1 ? dados[dados.length - 2][chave] : atual;

  return Math.round((atual - anterior) * 10) / 10;
}

function KpiExecutivoCard({
  kpi,
  valor,
  variacao,
}: {
  kpi: KpiExecutivo;
  valor: number;
  variacao: number;
}) {
  const tone = classificarKpi(valor, kpi.melhor);
  const melhorou =
    variacao === 0 ? null : kpi.melhor === "maior" ? variacao > 0 : variacao < 0;

  return (
    <SecpKpiCard
      label={kpi.label}
      value={`${formatarNumero(valor)}%`}
      detail={kpi.detalhe}
      icon={kpi.icon}
      tone={tone}
      trend={
        variacao === 0
          ? "estavel frente ao mes anterior"
          : `${melhorou ? "melhorou" : "piorou"} ${formatarNumero(Math.abs(variacao))} p.p.`
      }
    />
  );
}

function MultiIndicadorLineChart({
  dados,
}: {
  dados: SerieMensalIndicadores[];
}) {
  if (dados.length === 0) {
    return (
      <SecpChartCard title="Evolução mensal dos indicadores-chave">
        <EmptyChart />
      </SecpChartCard>
    );
  }

  const linhas = KPIS_EXECUTIVOS.filter((kpi) =>
    ["pontualidade", "espelhosHomologados", "absenteismo", "pendencias"].includes(
      kpi.chave,
    ),
  );
  const series: SecpLineSerie[] = linhas.map((kpi) => ({
    key: kpi.chave,
    dataKey: kpi.chave,
    label: kpi.label,
    color: kpi.cor,
  }));

  return (
    <SecpChartCard
      title="Evolução mensal dos principais indicadores operacionais"
      description="Pontualidade, homologação, absenteismo e pendências em percentual."
    >
      <SecpLineChart
        data={dados}
        series={series}
        xDataKey="label"
        valueSuffix="%"
        yDomain={[0, 100]}
      />
    </SecpChartCard>
  );
}

function PainelIndicadoresExecutivos({ dados }: { dados: PainelExecutivoDados }) {
  const atual = ultimoItem(dados.indicadoresExecutivos);
  const alertas = [
    {
      label: "Homologação pendente",
      valor: dados.metricas.homologacoesPendentes,
      detalhe: "espelho(s) aguardando acao",
    },
    {
      label: "Banco de horas acima do limite",
      valor: atual?.bancoHorasCritico ?? 0,
      detalhe: "servidores em faixa critica",
      percentual: true,
    },
    {
      label: "Alta marcação manual/web",
      valor: atual?.marcacoesManuaisWeb ?? 0,
      detalhe: "registros nao biometricos",
      percentual: true,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {KPIS_EXECUTIVOS.map((kpi) => (
          <KpiExecutivoCard
            key={kpi.chave}
            kpi={kpi}
            valor={atual?.[kpi.chave] ?? 0}
            variacao={variacaoKpi(dados.indicadoresExecutivos, kpi.chave)}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <MultiIndicadorLineChart dados={dados.indicadoresExecutivos} />

        <SecpChartCard
          title="Alertas acionaveis"
          description="Prioridades para atuação imédiata."
          kpi={<TrendingUp className="size-5 text-secp-blue-900" aria-hidden="true" />}
        >
          <div className="mt-4 grid gap-3">
            {alertas.map((alerta) => (
              <div
                key={alerta.label}
                className="rounded-md border border-border bg-muted/35 p-3"
              >
                <p className="text-sm font-bold">{alerta.label}</p>
                <p className="mt-1 text-2xl font-black">
                  {formatarNumero(alerta.valor)}
                  {alerta.percentual ? "%" : ""}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {alerta.detalhe}
                </p>
              </div>
            ))}
          </div>
        </SecpChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SecpChartCard
          title="Ranking de unidades críticas"
          description="Unidades com maior volume de ocorrências no escopo ativo."
        >
          <SecpHorizontalBarChart data={dados.ocorrenciasPorUnidade} />
        </SecpChartCard>
        <SecpChartCard
          title="Principais inconsistências de ponto"
          description="Tipos de ocorrência mais frequentes na competência."
        >
          <SecpHorizontalBarChart
            data={dados.ocorrenciasPorTipo}
            color="#dc2626"
          />
        </SecpChartCard>
      </section>
    </div>
  );
}

const PENDENCIAS_PONTO_SERIES = [
  {
    key: "batidaFaltante",
    dataKey: "batidaFaltante",
    label: "Batida faltante",
    color: "#dc2626",
  },
  {
    key: "justificativaPendente",
    dataKey: "justificativaPendente",
    label: "Justificativa pendente",
    color: "#ea580c",
  },
  {
    key: "aprovacaoGestor",
    dataKey: "aprovacaoGestor",
    label: "Aprovação do gestor",
    color: "#7c3aed",
  },
  {
    key: "homologacaoRH",
    dataKey: "homologacaoRH",
    label: "Homologação RH",
    color: "#1d4ed8",
  },
  {
    key: "inconsistenciaJornada",
    dataKey: "inconsistenciaJornada",
    label: "Inconsistência de jornada",
    color: "#0891b2",
  },
] as const;

function PainelPendênciasPonto({ dados }: { dados: PainelExecutivoDados }) {
  const resumo = dados.pendenciasPonto;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Total de pendências"
          value={resumo.totalAbertas}
          detail="abertas na competência"
          icon={AlertTriangle}
          tone={resumo.totalAbertas > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Servidores afetados"
          value={resumo.servidoresAfetados}
          detail="com pelo menos uma pendência"
          icon={UsersRound}
          tone={resumo.servidoresAfetados > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Unidade mais crítica"
          value={resumo.unidadeMaisCritica}
          detail="maior volume acumulado"
          icon={Server}
          tone={resumo.totalAbertas > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Pendências vencidas"
          value={resumo.vencidas}
          detail="5 dias ou mais em aberto"
          icon={Clock3}
          tone={resumo.vencidas > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Média em aberto"
          value={`${formatarNumero(resumo.mediaDiasEmAberto)} dias`}
          detail="idade média das pendências"
          icon={Gauge}
          tone={resumo.mediaDiasEmAberto >= 5 ? "orange" : "blue"}
        />
        <SecpKpiCard
          label="Aguardando gestor"
          value={resumo.aguardandoGestor}
          detail="ação pendente da chefia"
          icon={CheckCircle2}
          tone={resumo.aguardandoGestor > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Aguardando RH"
          value={resumo.aguardandoRh}
          detail="homologação ou tratamento RH"
          icon={Activity}
          tone={resumo.aguardandoRh > 0 ? "orange" : "green"}
        />
      </section>

      <SecpChartCard
        title="Pendências de ponto por unidade"
        description="Distribuição das pendências abertas por unidade administrativa, separadas por tipo de tratamento necessário."
      >
        <SecpStackedHorizontalBarChart
          data={resumo.porUnidade}
          xKeys={[...PENDENCIAS_PONTO_SERIES]}
          yDataKey="unidade"
          stackId="pendencias"
        />
      </SecpChartCard>

      <SecpChartCard
        title="Tabela detalhada"
        description="Pendências mais antigas no escopo ativo, com link para tratamento."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Servidor</th>
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 font-bold">Tipo</th>
              <th className="px-3 py-3 font-bold">Responsavel</th>
              <th className="px-3 py-3 text-right font-bold">Dias</th>
              <th className="px-3 py-3 font-bold">Status</th>
              <th className="px-3 py-3 font-bold">Criticidade</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.detalhes.map((pendencia) => (
              <tr
                key={pendencia.id}
                className="border-b last:border-b-0 hover:bg-muted/40"
              >
                <td className="px-3 py-3 font-semibold">{pendencia.servidor}</td>
                <td className="px-3 py-3">{pendencia.unidade}</td>
                <td className="px-3 py-3">{pendencia.tipo}</td>
                <td className="px-3 py-3">{pendencia.responsavelAtual}</td>
                <td className="px-3 py-3 text-right font-bold">
                  {pendencia.diasEmAberto}
                </td>
                <td className="px-3 py-3">{formatarTextoPainel(pendencia.status)}</td>
                <td className="px-3 py-3">
                  <span
                    className={[
                      "rounded px-2 py-1 text-xs font-bold",
                      pendencia.criticidade === "Critica"
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : pendencia.criticidade === "Alta"
                          ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100"
                          : pendencia.criticidade === "Media"
                            ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                    ].join(" ")}
                  >
                    {formatarTextoPainel(pendencia.criticidade)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={pendencia.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.detalhes.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-sm font-medium text-muted-foreground"
                >
                  Nenhuma pendência aberta para o escopo e competência selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

const FREQUENCIA_ASSIDUIDADE_SERIES: SecpLineSerie[] = [
  {
    key: "frequencia",
    dataKey: "frequencia",
    label: "Frequência",
    color: "#1d4ed8",
  },
  {
    key: "assiduidade",
    dataKey: "assiduidade",
    label: "Assiduidade",
    color: "#059669",
  },
  {
    key: "ausenciasInconsistencias",
    dataKey: "ausenciasInconsistencias",
    label: "Ausências/inconsistências",
    color: "#dc2626",
  },
];

function PainelFrequênciaAssiduidade({
  dados,
}: {
  dados: PainelExecutivoDados;
}) {
  const resumo = dados.frequenciaAssiduidade;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Frequência média"
          value={`${formatarNumero(resumo.frequenciaMedia)}%`}
          detail="dias com jornada valida"
          icon={Clock3}
          tone={resumo.frequenciaMedia >= 95 ? "green" : "orange"}
        />
        <SecpKpiCard
          label="Assiduidade média"
          value={`${formatarNumero(resumo.assiduidadeMedia)}%`}
          detail="regularidade sem faltas graves"
          icon={CheckCircle2}
          tone={resumo.assiduidadeMedia >= 95 ? "green" : "orange"}
          trend={`${resumo.variacaoMesAnterior >= 0 ? "+" : ""}${formatarNumero(resumo.variacaoMesAnterior)} p.p. vs mes anterior`}
        />
        <SecpKpiCard
          label="Ausências injustificadas"
          value={resumo.ausenciasInjustificadas}
          detail="faltas registradas no período"
          icon={AlertTriangle}
          tone={resumo.ausenciasInjustificadas > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Servidores críticos"
          value={resumo.servidoresCriticos}
          detail="assiduidade baixa ou reincidência"
          icon={UsersRound}
          tone={resumo.servidoresCriticos > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Jornadas incompletas"
          value={resumo.jornadasIncompletas}
          detail="débito ou apuração incompleta"
          icon={Gauge}
          tone={resumo.jornadasIncompletas > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Menor assiduidade"
          value={resumo.unidadeMenorAssiduidade}
          detail="unidade que exige atenção"
          icon={Server}
          tone={resumo.unidadeMenorAssiduidade !== "-" ? "orange" : "green"}
        />
      </section>

      <SecpChartCard
        title="Frequência e assiduidade mensal"
        description="Evolução dos índices de comparecimento regular, assiduidade e ocorrências que impactam a frequência funcional."
      >
        <SecpLineChart
          data={resumo.serieMensal}
          series={FREQUENCIA_ASSIDUIDADE_SERIES}
          xDataKey="label"
          valueSuffix="%"
          yDomain={[0, 120]}
        />
      </SecpChartCard>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <SecpChartCard
          title="Unidades com menor assiduidade"
          description="Ranking das unidades que mais exigem atenção do RH no escopo ativo."
        >
          <SecpHorizontalBarChart
            data={resumo.rankingUnidades.map((unidade) => ({
              label: unidade.unidade,
              valor: unidade.assiduidade,
            }))}
            color="#ea580c"
            valueSuffix="%"
          />
        </SecpChartCard>

        <SecpChartCard
          title="Tabela acionavel"
          description="Servidores com menor assiduidade ou maior volume de pendências."
          contentClassName="overflow-x-auto"
        >
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-3 font-bold">Servidor</th>
                <th className="px-3 py-3 font-bold">Unidade</th>
                <th className="px-3 py-3 text-right font-bold">Frequência</th>
                <th className="px-3 py-3 text-right font-bold">Assiduidade</th>
                <th className="px-3 py-3 text-right font-bold">Ausências</th>
                <th className="px-3 py-3 text-right font-bold">Pendências</th>
                <th className="px-3 py-3 font-bold">Situação</th>
                <th className="px-3 py-3 text-right font-bold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {resumo.detalhes.map((item) => (
                <tr
                  key={item.servidorId}
                  className="border-b last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-3 font-semibold">{item.servidor}</td>
                  <td className="px-3 py-3">{item.unidade}</td>
                  <td className="px-3 py-3 text-right font-bold">
                    {formatarNumero(item.frequencia)}%
                  </td>
                  <td className="px-3 py-3 text-right font-bold">
                    {formatarNumero(item.assiduidade)}%
                  </td>
                  <td className="px-3 py-3 text-right">{item.ausencias}</td>
                  <td className="px-3 py-3 text-right">{item.pendencias}</td>
                  <td className="px-3 py-3">
                    <span
                      className={[
                        "rounded px-2 py-1 text-xs font-bold",
                        item.situacao === "Critica"
                          ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                          : item.situacao === "Atencao"
                            ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                      ].join(" ")}
                    >
                      {formatarTextoPainel(item.situacao)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={item.href}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {resumo.detalhes.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-sm font-medium text-muted-foreground"
                  >
                    Nenhum servidor com apuracao de frequencia para o escopo e competencia selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SecpChartCard>
      </section>
    </div>
  );
}

function PainelJustificativasAssiduidade({
  dados,
}: {
  dados: PainelExecutivoDados;
}) {
  const resumo = dados.justificativasAssiduidade;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Assiduidade média"
          value={`${formatarNumero(resumo.assiduidadeMedia)}%`}
          detail="índice final do período"
          icon={CheckCircle2}
          tone={resumo.assiduidadeMedia >= 95 ? "green" : "orange"}
        />
        <SecpKpiCard
          label="Justificativas abertas"
          value={resumo.justificativasAbertas}
          detail="aguardando análise"
          icon={Activity}
          tone={resumo.justificativasAbertas > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Justificativas vencidas"
          value={resumo.justificativasVencidas}
          detail="5 dias ou mais sem decisão"
          icon={Clock3}
          tone={resumo.justificativasVencidas > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Deferidas"
          value={`${formatarNumero(resumo.deferidasPercentual)}%`}
          detail="sobre justificativas decididas"
          icon={Gauge}
          tone="green"
        />
        <SecpKpiCard
          label="Indeferidas"
          value={`${formatarNumero(resumo.indeferidasPercentual)}%`}
          detail="sobre justificativas decididas"
          icon={AlertTriangle}
          tone={resumo.indeferidasPercentual > 20 ? "red" : "orange"}
        />
        <SecpKpiCard
          label="Sem justificativa"
          value={resumo.ausenciasSemJustificativa}
          detail="ausências ainda sem tratamento"
          icon={Server}
          tone={resumo.ausenciasSemJustificativa > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Tempo médio de análise"
          value={`${formatarNumero(resumo.tempoMedioAnaliseDias)} dias`}
          detail="entre solicitação e decisão"
          icon={TrendingUp}
          tone={resumo.tempoMedioAnaliseDias > 5 ? "orange" : "blue"}
        />
      </section>

      <SecpChartCard
        title="Justificativas e assiduidade mensal"
        description="Relação entre assiduidade funcional, justificativas deferidas, pendentes, indeferidas e ausências sem justificativa."
      >
        <SecpComposedChart
          data={resumo.serieMensal}
          xDataKey="label"
          bars={[
            {
              key: "justificativasDeferidas",
              dataKey: "justificativasDeferidas",
              label: "Deferidas",
              color: "#059669",
              stackId: "justificativas",
            },
            {
              key: "justificativasPendentes",
              dataKey: "justificativasPendentes",
              label: "Pendentes",
              color: "#ea580c",
              stackId: "justificativas",
            },
            {
              key: "justificativasIndeferidas",
              dataKey: "justificativasIndeferidas",
              label: "Indeferidas",
              color: "#dc2626",
              stackId: "justificativas",
            },
            {
              key: "justificativasVencidas",
              dataKey: "justificativasVencidas",
              label: "Vencidas",
              color: "#7c3aed",
              stackId: "justificativas",
            },
          ]}
          lines={[
            {
              key: "assiduidade",
              dataKey: "assiduidade",
              label: "Assiduidade",
              color: "#1d4ed8",
              valueSuffix: "%",
            },
          ]}
        />
      </SecpChartCard>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <SecpChartCard
          title="Unidades com maior volume de pendências"
          description="Pendentes, vencidas e ausências sem justificativa por unidade."
        >
          <SecpHorizontalBarChart
            data={resumo.rankingUnidades.map((unidade) => ({
              label: unidade.unidade,
              valor: unidade.total,
            }))}
            color="#7c3aed"
          />
        </SecpChartCard>

        <SecpChartCard
          title="Fila acionavel"
          description="Justificativas pendentes, vencidas ou ausências sem tratamento."
          contentClassName="overflow-x-auto"
        >
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-3 font-bold">Servidor</th>
                <th className="px-3 py-3 font-bold">Unidade</th>
                <th className="px-3 py-3 font-bold">Ocorrencia</th>
                <th className="px-3 py-3 font-bold">Justificativa</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-3 py-3 text-right font-bold">Dias</th>
                <th className="px-3 py-3 font-bold">Impacto</th>
                <th className="px-3 py-3 text-right font-bold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {resumo.detalhes.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-3 font-semibold">{item.servidor}</td>
                  <td className="px-3 py-3">{item.unidade}</td>
                  <td className="px-3 py-3">{item.ocorrencia}</td>
                  <td className="px-3 py-3">{item.justificativa}</td>
                  <td className="px-3 py-3">{formatarTextoPainel(item.status)}</td>
                  <td className="px-3 py-3 text-right font-bold">{item.diasEmAnalise}</td>
                  <td className="px-3 py-3">
                    <span
                      className={[
                        "rounded px-2 py-1 text-xs font-bold",
                        item.impactoAssiduidade === "Impacta"
                          ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                          : item.impactoAssiduidade === "Risco"
                            ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                      ].join(" ")}
                    >
                      {item.impactoAssiduidade}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={item.href}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {resumo.detalhes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                    Nenhuma justificativa pendente ou ausencia sem tratamento para o escopo selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SecpChartCard>
      </section>
    </div>
  );
}

function PainelHomologacaoMensal({ dados }: { dados: PainelExecutivoDados }) {
  const resumo = dados.homologacaoMensal;
  const pendentes =
    resumo.pendentesServidor + resumo.pendentesChefia + resumo.pendentesRh;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Competência"
          value={resumo.competencia}
          detail={`${resumo.diasPrazoFinal} dia(s) ate o prazo final`}
          icon={CalendarDays}
          tone={resumo.diasPrazoFinal === 0 && pendentes > 0 ? "red" : "blue"}
        />
        <SecpKpiCard
          label="Espelhos esperados"
          value={resumo.espelhosEsperados}
          detail="servidores ativos no escopo"
          icon={UsersRound}
          tone="blue"
        />
        <SecpKpiCard
          label="Espelhos enviados"
          value={resumo.espelhosEnviados}
          detail="com registro de fechamento"
          icon={Activity}
          tone="blue"
        />
        <SecpKpiCard
          label="Homologados"
          value={resumo.homologados}
          detail={`${formatarNumero(percentualLocal(resumo.homologados, resumo.espelhosEsperados))}% dos esperados`}
          icon={CheckCircle2}
          tone={pendentes === 0 ? "green" : "orange"}
        />
        <SecpKpiCard
          label="Pendentes servidor"
          value={resumo.pendentesServidor}
          detail="não enviados ou com pendência"
          icon={AlertTriangle}
          tone={resumo.pendentesServidor > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Pendentes chefia"
          value={resumo.pendentesChefia}
          detail="aguardando aprovação"
          icon={Gauge}
          tone={resumo.pendentesChefia > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Pendentes RH"
          value={resumo.pendentesRh}
          detail="aguardando fechamento administrativo"
          icon={Server}
          tone={resumo.pendentesRh > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Unidades fechadas"
          value={resumo.unidadesFechadas}
          detail="100% homologadas"
          icon={TrendingUp}
          tone="green"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <SecpChartCard
          title="Homologação mensal por unidade"
          description="Percentual de espelhos de ponto homologados, ordenado pelas unidades que exigem maior atenção."
        >
          <SecpHorizontalBarChart
            data={resumo.porUnidade.map((unidade) => ({
              label: unidade.unidade,
              valor: unidade.percentualHomologado,
            }))}
            color="#1d4ed8"
            valueSuffix="%"
          />
        </SecpChartCard>

        <SecpChartCard
          title="Funil de status"
          description="Fluxo esperado do fechamento mensal."
        >
          <div className="grid gap-3">
            {resumo.funil.map((item, index) => (
              <div key={item.label} className="rounded-md border border-border bg-muted/35 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">{item.label}</span>
                  <span className="text-2xl font-black">{formatarNumero(item.valor)}</span>
                </div>
                {index < resumo.funil.length - 1 && (
                  <div className="mt-3 h-1 rounded-full bg-secp-blue-900/20" />
                )}
              </div>
            ))}
          </div>
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Fila acionavel"
        description="Espelhos ainda pendentes por unidade, servidor e responsavel atual."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 font-bold">Servidor</th>
              <th className="px-3 py-3 font-bold">Status</th>
              <th className="px-3 py-3 font-bold">Responsavel</th>
              <th className="px-3 py-3 font-bold">Pendencia</th>
              <th className="px-3 py-3 text-right font-bold">Dias</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.detalhes.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3">{item.unidade}</td>
                <td className="px-3 py-3 font-semibold">{item.servidor}</td>
                <td className="px-3 py-3">{formatarTextoPainel(item.status)}</td>
                <td className="px-3 py-3">{item.responsavelAtual}</td>
                <td className="px-3 py-3">{item.pendencia}</td>
                <td className="px-3 py-3 text-right font-bold">{item.diasAtraso}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.detalhes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhum espelho pendente para o escopo e competencia selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function percentualLocal(parte: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((parte / total) * 1000) / 10;
}

const JORNADA_CARGA_SERIES = [
  {
    key: "horasPrevistas",
    dataKey: "horasPrevistas",
    label: "Horas previstas",
    color: "#1d4ed8",
  },
  {
    key: "horasRealizadas",
    dataKey: "horasRealizadas",
    label: "Horas realizadas",
    color: "#059669",
  },
];

const TELETRABALHO_BARRAS = [
  {
    key: "presencial",
    dataKey: "presencial",
    label: "Presencial",
    color: "#1d4ed8",
  },
  {
    key: "teletrabalho",
    dataKey: "teletrabalho",
    label: "Teletrabalho",
    color: "#059669",
  },
];

const TELETRABALHO_LINHAS = [
  {
    key: "percentualRegistroWeb",
    dataKey: "percentualRegistroWeb",
    label: "Registro web",
    color: "#dc2626",
    valueSuffix: "%",
  },
];

const EQUIPAMENTOS_STATUS_SERIES = [
  {
    key: "online",
    dataKey: "online",
    label: "Online",
    color: "#059669",
  },
  {
    key: "atrasoComunicacao",
    dataKey: "atrasoComunicacao",
    label: "Atraso",
    color: "#ea580c",
  },
  {
    key: "offline",
    dataKey: "offline",
    label: "Offline",
    color: "#dc2626",
  },
  {
    key: "manutencao",
    dataKey: "manutencao",
    label: "Manutencao",
    color: "#64748b",
  },
  {
    key: "semSincronizacaoRecente",
    dataKey: "semSincronizacaoRecente",
    label: "Sem sincronização",
    color: "#7c3aed",
  },
];

const AUDITORIA_TIMELINE_SERIES: SecpLineSerie[] = [
  {
    key: "criticos",
    dataKey: "criticos",
    label: "Críticos",
    color: "#dc2626",
  },
  {
    key: "altos",
    dataKey: "altos",
    label: "Altos",
    color: "#ea580c",
  },
];

function formatarMinutosOperacionais(minutos: number) {
  if (minutos <= 0) return "-";
  if (minutos < 60) return `${formatarNumero(minutos)}min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto > 0 ? `${horas}h${String(resto).padStart(2, "0")}` : `${horas}h`;
}

function PainelJornadaCargaHoraria({ dados }: { dados: PainelExecutivoDados }) {
  const resumo = dados.jornadaCargaHoraria;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Carga prevista"
          value={`${formatarNumero(resumo.cargaPrevistaHoras)}h`}
          detail="soma da jornada esperada"
          icon={Clock3}
          tone="blue"
        />
        <SecpKpiCard
          label="Carga realizada"
          value={`${formatarNumero(resumo.cargaRealizadaHoras)}h`}
          detail="horas validas registradas"
          icon={Activity}
          tone="green"
        />
        <SecpKpiCard
          label="Saldo geral"
          value={`${resumo.saldoGeralHoras > 0 ? "+" : ""}${formatarNumero(resumo.saldoGeralHoras)}h`}
          detail="realizada menos prevista"
          icon={Gauge}
          tone={Math.abs(resumo.saldoGeralHoras) > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Aderencia"
          value={`${formatarNumero(resumo.aderencia)}%`}
          detail="realizada sobre prevista"
          icon={CheckCircle2}
          tone={resumo.aderencia >= 98 && resumo.aderencia <= 102 ? "green" : "orange"}
        />
        <SecpKpiCard
          label="Servidores com deficit"
          value={resumo.servidoresDeficit}
          detail="abaixo de 95% da carga"
          icon={AlertTriangle}
          tone={resumo.servidoresDeficit > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Servidores com excesso"
          value={resumo.servidoresExcesso}
          detail="acima de 105% da carga"
          icon={TrendingUp}
          tone={resumo.servidoresExcesso > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Jornadas incompletas"
          value={resumo.jornadasIncompletas}
          detail="dias com débito/incompleta"
          icon={Server}
          tone={resumo.jornadasIncompletas > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Unidade crítica"
          value={resumo.unidadeMaisCritica}
          detail="maior distorcao de saldo"
          icon={UsersRound}
          tone={resumo.unidadeMaisCritica !== "-" ? "orange" : "green"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)]">
        <SecpChartCard
          title="Carga horaria prevista x realizada por unidade"
          description="Comparativo mensal entre a carga esperada e a carga efetivamente registrada no ponto eletronico."
        >
          <SecpComparativeHorizontalBarChart
            data={resumo.porUnidade}
            xKeys={JORNADA_CARGA_SERIES}
            yDataKey="unidade"
            valueSuffix="h"
          />
        </SecpChartCard>

        <SecpChartCard
          title="Saldo de horas por unidade"
          description="Diferenca entre horas realizadas e previstas."
        >
          <SecpHorizontalBarChart
            data={resumo.saldosPorUnidade}
            color="#7c3aed"
            valueSuffix="h"
          />
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Tabela operacional"
        description="Servidores com maior deficit, excesso ou distorcao de aderencia."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[58rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Servidor</th>
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 text-right font-bold">Prevista</th>
              <th className="px-3 py-3 text-right font-bold">Realizada</th>
              <th className="px-3 py-3 text-right font-bold">Saldo</th>
              <th className="px-3 py-3 text-right font-bold">Aderencia</th>
              <th className="px-3 py-3 font-bold">Situação</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.detalhes.map((item) => (
              <tr key={item.servidorId} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3 font-semibold">{item.servidor}</td>
                <td className="px-3 py-3">{item.unidade}</td>
                <td className="px-3 py-3 text-right">{formatarNumero(item.horasPrevistas)}h</td>
                <td className="px-3 py-3 text-right">{formatarNumero(item.horasRealizadas)}h</td>
                <td className="px-3 py-3 text-right font-bold">
                  {item.saldoHoras > 0 ? "+" : ""}
                  {formatarNumero(item.saldoHoras)}h
                </td>
                <td className="px-3 py-3 text-right font-bold">{formatarNumero(item.aderencia)}%</td>
                <td className="px-3 py-3">
                  <span
                    className={[
                      "rounded px-2 py-1 text-xs font-bold",
                      item.situacao === "Critico"
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : item.situacao === "Excesso"
                          ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100"
                          : item.situacao === "Atencao"
                            ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                    ].join(" ")}
                  >
                    {formatarTextoPainel(item.situacao)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.detalhes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhuma apuracao de jornada encontrada para o escopo e competencia selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function PainelTeletrabalhoRegistroWeb({
  dados,
}: {
  dados: PainelExecutivoDados;
}) {
  const resumo = dados.teletrabalhoRegistroWeb;
  const rankingUsoWeb = resumo.rankingUnidades.map((unidade) => ({
    label: unidade.unidade,
    valor: unidade.percentualWeb,
  }));

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Presenciais"
          value={resumo.servidoresPresenciais}
          detail="servidores sem autorização remota"
          icon={UsersRound}
          tone="blue"
        />
        <SecpKpiCard
          label="Teletrabalho"
          value={resumo.servidoresTeletrabalho}
          detail={`${formatarNumero(resumo.percentualTeletrabalho)}% do escopo`}
          icon={Server}
          tone="green"
        />
        <SecpKpiCard
          label="Biometria/facial"
          value={`${formatarNumero(resumo.percentualBiometricoFacial)}%`}
          detail="marcações biometricas validas"
          icon={CheckCircle2}
          tone="green"
        />
        <SecpKpiCard
          label="Registro web"
          value={`${formatarNumero(resumo.percentualRegistroWeb)}%`}
          detail="participação no total de marcações"
          icon={Activity}
          tone={resumo.percentualRegistroWeb >= 30 ? "orange" : "blue"}
        />
        <SecpKpiCard
          label="Web sem vínculo"
          value={resumo.registroWebSemVinculo}
          detail="servidores presenciais com web"
          icon={AlertTriangle}
          tone={resumo.registroWebSemVinculo > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Unidades com web elevado"
          value={resumo.unidadesUsoWebElevado}
          detail="30% ou mais de marcações web"
          icon={TrendingUp}
          tone={resumo.unidadesUsoWebElevado > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Servidores em alerta"
          value={resumo.servidoresAlerta}
          detail="web irregular ou jornada crítica"
          icon={Gauge}
          tone={resumo.servidoresAlerta > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Competência"
          value={dados.competencia.rotulo}
          detail="período analisado"
          icon={CalendarDays}
          tone="blue"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <SecpChartCard
          title="Teletrabalho, presencial e registro web"
          description="Distribuição mensal das modalidades e percentual de marcações feitas pela web."
        >
          <SecpComposedChart
            data={resumo.serieMensal}
            xDataKey="label"
            bars={TELETRABALHO_BARRAS}
            lines={TELETRABALHO_LINHAS}
          />
        </SecpChartCard>

        <SecpChartCard
          title="Unidades com maior uso web"
          description="Ranking por percentual de marcações web na competência."
        >
          <SecpHorizontalBarChart
            data={rankingUsoWeb}
            color="#dc2626"
            valueSuffix="%"
          />
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Tabela acionavel"
        description="Servidores com maior uso web, autorização remota e situação operacional."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[62rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Servidor</th>
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 font-bold">Modalidade</th>
              <th className="px-3 py-3 font-bold">Origem predominante</th>
              <th className="px-3 py-3 text-right font-bold">% Web</th>
              <th className="px-3 py-3 font-bold">Autorizacao</th>
              <th className="px-3 py-3 font-bold">Situação</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.detalhes.map((item) => (
              <tr key={item.servidorId} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3 font-semibold">{item.servidor}</td>
                <td className="px-3 py-3">{item.unidade}</td>
                <td className="px-3 py-3">{item.modalidade}</td>
                <td className="px-3 py-3">{item.origemPredominante}</td>
                <td className="px-3 py-3 text-right font-bold">{formatarNumero(item.percentualWeb)}%</td>
                <td className="px-3 py-3">{item.autorizacao}</td>
                <td className="px-3 py-3">
                  <span
                    className={[
                      "rounded px-2 py-1 text-xs font-bold",
                      item.situacao === "Critica"
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : item.situacao === "Atencao"
                          ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100"
                          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                    ].join(" ")}
                  >
                    {formatarTextoPainel(item.situacao)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.detalhes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhuma marcacao ou alerta encontrado para o escopo e competencia selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function PainelEquipamentosPonto({ dados }: { dados: PainelExecutivoDados }) {
  const resumo = dados.equipamentosPonto;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Total de equipamentos"
          value={resumo.totalEquipamentos}
          detail="coletores cadastrados no escopo"
          icon={Server}
          tone="blue"
        />
        <SecpKpiCard
          label="Online"
          value={resumo.online}
          detail="comunicaram nos ultimos 15min"
          icon={CheckCircle2}
          tone="green"
        />
        <SecpKpiCard
          label="Offline"
          value={resumo.offline}
          detail="sem comunicação acima de 60min"
          icon={AlertTriangle}
          tone={resumo.offline > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Com atraso"
          value={resumo.atrasoComunicacao}
          detail="sem comunicação entre 15 e 60min"
          icon={Clock3}
          tone={resumo.atrasoComunicacao > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Manutencao"
          value={resumo.manutencao}
          detail="equipamentos inativos"
          icon={Gauge}
          tone={resumo.manutencao > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Sem sincronização"
          value={resumo.semSincronizacaoRecente}
          detail="comunica, mas coleta atrasada"
          icon={Activity}
          tone={resumo.semSincronizacaoRecente > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Última coleta AFD"
          value={resumo.ultimaColetaAfd}
          detail="arquivo processado mais recente"
          icon={CalendarDays}
          tone="blue"
        />
        <SecpKpiCard
          label="Pendentes de importação"
          value={resumo.marcacoesPendentesImportacao}
          detail={`unidade critica: ${resumo.unidadeMaisCritica}`}
          icon={TrendingUp}
          tone={resumo.marcacoesPendentesImportacao > 0 ? "red" : "green"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <SecpChartCard
          title="Status dos equipamentos de ponto por unidade"
          description="Situação operacional dos equipamentos biometricos, faciais e coletores por unidade."
        >
          <SecpStackedHorizontalBarChart
            data={resumo.porUnidade}
            xKeys={EQUIPAMENTOS_STATUS_SERIES}
            yDataKey="unidade"
          />
        </SecpChartCard>

        <SecpChartCard
          title="Equipamentos com mais falhas"
          description="Ranking de eventos de erro registrados na competência."
        >
          <SecpHorizontalBarChart
            data={resumo.rankingFalhas}
            color="#dc2626"
          />
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Tabela operacional"
        description="Monitoramento técnico dos equipamentos, comunicação, NSR e pendências de importação."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[72rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Equipamento</th>
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 font-bold">IP</th>
              <th className="px-3 py-3 font-bold">Tipo</th>
              <th className="px-3 py-3 font-bold">Última comunicação</th>
              <th className="px-3 py-3 font-bold">Tempo</th>
              <th className="px-3 py-3 font-bold">Última NSR</th>
              <th className="px-3 py-3 text-right font-bold">Pendentes</th>
              <th className="px-3 py-3 font-bold">Status</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.detalhes.map((item) => (
              <tr key={item.equipamentoId} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3 font-semibold">{item.equipamento}</td>
                <td className="px-3 py-3">{item.unidade}</td>
                <td className="px-3 py-3">{item.ip}</td>
                <td className="px-3 py-3">{item.tipo}</td>
                <td className="px-3 py-3">{item.ultimaComunicacao}</td>
                <td className="px-3 py-3">{formatarMinutosOperacionais(item.tempoSemComunicarMinutos)}</td>
                <td className="px-3 py-3">{item.ultimaNsr}</td>
                <td className="px-3 py-3 text-right font-bold">{formatarNumero(item.marcacoesPendentes)}</td>
                <td className="px-3 py-3">
                  <span
                    className={[
                      "rounded px-2 py-1 text-xs font-bold",
                      item.status === "Offline"
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : item.status === "Atraso" || item.status === "Sem sincronizacao"
                          ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100"
                          : item.status === "Manutencao"
                            ? "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                    ].join(" ")}
                  >
                    {formatarTextoPainel(item.status)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.detalhes.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhum equipamento encontrado para o escopo selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function PainelAuditoriaConformidade({
  dados,
}: {
  dados: PainelExecutivoDados;
}) {
  const resumo = dados.auditoriaConformidade;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Conformidade geral"
          value={`${formatarNumero(resumo.indiceConformidade)}%`}
          detail="índice ponderado de risco"
          icon={Gauge}
          tone={resumo.indiceConformidade >= 90 ? "green" : "orange"}
        />
        <SecpKpiCard
          label="Achados abertos"
          value={resumo.achadosAbertos}
          detail="riscos consolidados no mês"
          icon={AlertTriangle}
          tone={resumo.achadosAbertos > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Achados críticos"
          value={resumo.achadosCriticos}
          detail="risco alto para integridade"
          icon={Server}
          tone={resumo.achadosCriticos > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Ajustes manuais"
          value={resumo.alteracoesManuaisMes}
          detail="marcações e banco de horas"
          icon={Activity}
          tone={resumo.alteracoesManuaisMes > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Registro web irregular"
          value={resumo.registrosWebForaPadrao}
          detail="web sem vínculo autorizado"
          icon={TrendingUp}
          tone={resumo.registrosWebForaPadrao > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Espelhos reabertos"
          value={resumo.espelhosReabertos}
          detail="reaberturas na trilha"
          icon={Clock3}
          tone={resumo.espelhosReabertos > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Pos-homologação"
          value={resumo.operacoesAposHomologacao}
          detail="operacoes apos fechamento"
          icon={CheckCircle2}
          tone={resumo.operacoesAposHomologacao > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Permissoes sensíveis"
          value={resumo.usuariosPermissaoSensivel}
          detail="usuarios com acesso crítico"
          icon={UsersRound}
          tone={resumo.usuariosPermissaoSensivel > 0 ? "orange" : "green"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <SecpChartCard
          title="Risco de conformidade por dimensao"
          description="Quantidade de achados classificados por area de controle do ponto eletronico."
        >
          <SecpHorizontalBarChart
            data={resumo.riscoPorDimensao}
            color="#7c3aed"
          />
        </SecpChartCard>

        <SecpChartCard
          title="Linha do tempo de eventos críticos"
          description="Eventos críticos e altos registrados na trilha de auditoria durante a competência."
        >
          <SecpLineChart
            data={resumo.timelineEventosCriticos}
            series={AUDITORIA_TIMELINE_SERIES}
            xDataKey="label"
          />
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Tabela forense"
        description="Eventos sensíveis com usuario, perfil, entidade, justificativa e situação de tratamento."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[72rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Data/hora</th>
              <th className="px-3 py-3 font-bold">Usuario</th>
              <th className="px-3 py-3 font-bold">Perfil</th>
              <th className="px-3 py-3 font-bold">Evento</th>
              <th className="px-3 py-3 font-bold">Entidade</th>
              <th className="px-3 py-3 font-bold">Criticidade</th>
              <th className="px-3 py-3 font-bold">Justificativa</th>
              <th className="px-3 py-3 font-bold">Situação</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.detalhes.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3">{item.dataHora}</td>
                <td className="px-3 py-3 font-semibold">{item.usuario}</td>
                <td className="px-3 py-3">{item.perfil}</td>
                <td className="px-3 py-3">{item.evento}</td>
                <td className="px-3 py-3">{item.entidade}</td>
                <td className="px-3 py-3">
                  <span
                    className={[
                      "rounded px-2 py-1 text-xs font-bold",
                      item.criticidade === "Critica"
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : item.criticidade === "Alta"
                          ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100"
                          : item.criticidade === "Media"
                            ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                    ].join(" ")}
                  >
                    {formatarTextoPainel(String(item.criticidade))}
                  </span>
                </td>
                <td className="max-w-[18rem] truncate px-3 py-3">{item.justificativa}</td>
                <td className="px-3 py-3">{formatarTextoPainel(item.situacao)}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.detalhes.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhum evento sensivel encontrado para o escopo e competencia selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function PainelIndicadoresUnidadeChefia({
  dados,
}: {
  dados: PainelExecutivoDados;
}) {
  const resumo = dados.indicadoresUnidadeChefia;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Melhor unidade"
          value={resumo.melhorUnidade}
          detail="maior índice executivo"
          icon={CheckCircle2}
          tone="green"
        />
        <SecpKpiCard
          label="Unidade em atenção"
          value={resumo.unidadeAtencao}
          detail="menor índice consolidado"
          icon={AlertTriangle}
          tone={resumo.unidadeAtencao !== "-" ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Chefias críticas"
          value={resumo.chefiasPendenciaCritica}
          detail="com pendência crítica"
          icon={UsersRound}
          tone={resumo.chefiasPendenciaCritica > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Média geral"
          value={`${formatarNumero(resumo.mediaGeralConformidade)}%`}
          detail="índice médio de gestão"
          icon={Gauge}
          tone={resumo.mediaGeralConformidade >= 85 ? "green" : "orange"}
        />
        <SecpKpiCard
          label="Homologação média"
          value={`${formatarNumero(resumo.homologacaoMedia)}%`}
          detail="espelhos homologados"
          icon={CalendarDays}
          tone={resumo.homologacaoMedia >= 90 ? "green" : "orange"}
        />
        <SecpKpiCard
          label="Assiduidade média"
          value={`${formatarNumero(resumo.assiduidadeMedia)}%`}
          detail="regularidade funcional"
          icon={Activity}
          tone={resumo.assiduidadeMedia >= 90 ? "green" : "orange"}
        />
        <SecpKpiCard
          label="Pendências abertas"
          value={resumo.pendenciasAbertas}
          detail="ocorrências e fluxos pendentes"
          icon={Clock3}
          tone={resumo.pendenciasAbertas > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Ajustes manuais"
          value={resumo.ajustesManuaisMes}
          detail="marcações e banco no mês"
          icon={Server}
          tone={resumo.ajustesManuaisMes > 0 ? "orange" : "green"}
        />
      </section>

      <SecpChartCard
        title="Indicadores por unidade e chefia"
        description="Índice executivo consolidado de gestão do ponto eletronico por unidade e chefia responsavel."
      >
        <SecpHorizontalBarChart
          data={resumo.ranking}
          color="#1d4ed8"
          valueSuffix="%"
        />
      </SecpChartCard>

      <SecpChartCard
        title="Matriz semaforica de indicadores"
        description="Comparativo entre homologação, assiduidade, pontualidade, pendências e conformidade."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[72rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 font-bold">Chefia</th>
              <th className="px-3 py-3 text-right font-bold">Homologação</th>
              <th className="px-3 py-3 text-right font-bold">Assiduidade</th>
              <th className="px-3 py-3 text-right font-bold">Pontualidade</th>
              <th className="px-3 py-3 text-right font-bold">Pendências</th>
              <th className="px-3 py-3 text-right font-bold">Conformidade</th>
              <th className="px-3 py-3 text-right font-bold">Indice</th>
              <th className="px-3 py-3 font-bold">Situação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.matriz.map((item) => (
              <tr key={item.unidadeId} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3 font-semibold">{item.unidade}</td>
                <td className="px-3 py-3">{item.chefia}</td>
                <td className="px-3 py-3 text-right">{formatarNumero(item.homologacao)}%</td>
                <td className="px-3 py-3 text-right">{formatarNumero(item.assiduidade)}%</td>
                <td className="px-3 py-3 text-right">{formatarNumero(item.pontualidade)}%</td>
                <td className="px-3 py-3 text-right font-bold">{item.pendenciasAbertas}</td>
                <td className="px-3 py-3 text-right">{formatarNumero(item.conformidadeRegistros)}%</td>
                <td className="px-3 py-3 text-right font-bold">{formatarNumero(item.indiceGestao)}%</td>
                <td className="px-3 py-3">
                  <span
                    className={[
                      "rounded px-2 py-1 text-xs font-bold",
                      item.situacao === "Critico"
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : item.situacao === "Atencao"
                          ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100"
                          : item.situacao === "Excelente"
                            ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                    ].join(" ")}
                  >
                    {formatarTextoPainel(item.situacao)}
                  </span>
                </td>
              </tr>
            ))}
            {resumo.matriz.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhuma unidade encontrada para o escopo e competencia selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>

      <SecpChartCard
        title="Tabela acionavel"
        description="Unidades que exigem acompanhamento prioritario da chefia ou do RH."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[58rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 font-bold">Chefia</th>
              <th className="px-3 py-3 text-right font-bold">Servidores</th>
              <th className="px-3 py-3 text-right font-bold">Pendências</th>
              <th className="px-3 py-3 text-right font-bold">Homologação</th>
              <th className="px-3 py-3 font-bold">Ação recomendada</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.detalhes.map((item) => (
              <tr key={item.unidadeId} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3 font-semibold">{item.unidade}</td>
                <td className="px-3 py-3">{item.chefia}</td>
                <td className="px-3 py-3 text-right">{item.servidoresAtivos}</td>
                <td className="px-3 py-3 text-right font-bold">{item.pendenciasAbertas}</td>
                <td className="px-3 py-3 text-right">{formatarNumero(item.homologacao)}%</td>
                <td className="px-3 py-3">
                  {item.situacao === "Critico"
                    ? "Priorizar saneamento e fechamento mensal"
                    : item.situacao === "Atencao"
                      ? "Acompanhar pendencias e ajustes manuais"
                      : "Manter rotina de acompanhamento"}
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.detalhes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhuma unidade em acompanhamento prioritario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function PainelAlertasInteligentes({ dados }: { dados: PainelExecutivoDados }) {
  const resumo = dados.alertasInteligentes;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Alertas ativos"
          value={resumo.alertasAtivos}
          detail="fila inteligente aberta"
          icon={AlertTriangle}
          tone={resumo.alertasAtivos > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Críticos"
          value={resumo.alertasCriticos}
          detail="exigem ação imédiata"
          icon={Gauge}
          tone={resumo.alertasCriticos > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Vencidos"
          value={resumo.vencidos}
          detail="prazo ultrapassado"
          icon={Clock3}
          tone={resumo.vencidos > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Aguardando chefia"
          value={resumo.exigemChefia}
          detail="responsavel atual"
          icon={UsersRound}
          tone={resumo.exigemChefia > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Aguardando RH"
          value={resumo.exigemRh}
          detail="validação administrativa"
          icon={CheckCircle2}
          tone={resumo.exigemRh > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Aguardando NUTEC"
          value={resumo.exigemNutec}
          detail="alertas técnicos"
          icon={Server}
          tone={resumo.exigemNutec > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Bloqueiam homologação"
          value={resumo.bloqueiamHomologacao}
          detail="risco no fechamento mensal"
          icon={CalendarDays}
          tone={resumo.bloqueiamHomologacao > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Recorrentes"
          value={resumo.recorrentesMes}
          detail="categorias repetidas no mês"
          icon={TrendingUp}
          tone={resumo.recorrentesMes > 0 ? "orange" : "green"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
        <SecpChartCard
          title="Alertas inteligentes por prioridade"
          description="Ranking das categorias de alerta com maior impacto operacional no fechamento do ponto eletronico."
        >
          <SecpHorizontalBarChart
            data={resumo.rankingCategorias}
            color="#dc2626"
          />
        </SecpChartCard>

        <SecpChartCard
          title="Linha de vencimentos"
          description="Distribuição dos alertas por prazo de ação."
        >
          <SecpHorizontalBarChart
            data={resumo.timelineVencimentos}
            color="#ea580c"
          />
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Fila de alertas acionaveis"
        description="Alertas ordenados por pontuação de risco, responsavel atual, impacto e ação sugerida."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[78rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 text-right font-bold">Risco</th>
              <th className="px-3 py-3 font-bold">Alerta</th>
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 font-bold">Servidor</th>
              <th className="px-3 py-3 font-bold">Responsavel</th>
              <th className="px-3 py-3 font-bold">Prazo</th>
              <th className="px-3 py-3 font-bold">Impacto</th>
              <th className="px-3 py-3 font-bold">Ação sugerida</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.fila.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3 text-right font-bold">{item.pontuacaoRisco}</td>
                <td className="px-3 py-3">
                  <div className="grid gap-1">
                    <span className="font-semibold">{item.tipo}</span>
                    <span className="text-xs text-muted-foreground">{item.explicacao}</span>
                  </div>
                </td>
                <td className="px-3 py-3">{item.unidade}</td>
                <td className="px-3 py-3">{item.servidor}</td>
                <td className="px-3 py-3">{item.responsavelAtual}</td>
                <td className="px-3 py-3">
                  <span
                    className={[
                      "rounded px-2 py-1 text-xs font-bold",
                      item.prazo === "Vencido"
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : item.prazo === "Hoje"
                          ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100"
                          : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {item.prazo}
                  </span>
                </td>
                <td className="px-3 py-3">{item.impacto}</td>
                <td className="px-3 py-3">{item.acaoSugerida}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Ver origem
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.fila.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhum alerta inteligente ativo para o escopo e competencia selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function PainelBancoHoras({ dados }: { dados: PainelExecutivoDados }) {
  const resumo = dados.bancoHoras;
  const saldosPorUnidade = resumo.porUnidade.map((unidade) => ({
    label: unidade.unidade,
    valor: unidade.saldoHoras,
  }));

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Saldo geral"
          value={`${resumo.saldoGeralHoras > 0 ? "+" : ""}${formatarNumero(resumo.saldoGeralHoras)}h`}
          detail="saldo liquido consolidado"
          icon={Gauge}
          tone={Math.abs(resumo.saldoGeralHoras) > 4 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Crédito acumulado"
          value={`+${formatarNumero(resumo.horasPositivasAcumuladas)}h`}
          detail="horas positivas"
          icon={TrendingUp}
          tone={resumo.horasPositivasAcumuladas > 20 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Deficit acumulado"
          value={`${formatarNumero(resumo.horasNegativasAcumuladas)}h`}
          detail="horas negativas"
          icon={AlertTriangle}
          tone={resumo.horasNegativasAcumuladas < -10 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Servidores com crédito"
          value={resumo.servidoresComCredito}
          detail="saldo positivo"
          icon={UsersRound}
          tone="blue"
        />
        <SecpKpiCard
          label="Servidores com deficit"
          value={resumo.servidoresComDeficit}
          detail="saldo negativo"
          icon={Clock3}
          tone={resumo.servidoresComDeficit > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Situação crítica"
          value={resumo.servidoresCriticos}
          detail="deficit ou excesso crítico"
          icon={Server}
          tone={resumo.servidoresCriticos > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Horas vencendo"
          value={`${formatarNumero(resumo.horasProximasVencimento)}h`}
          detail="próximos 30 dias"
          icon={CalendarDays}
          tone={resumo.horasProximasVencimento > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Unidade crítica"
          value={resumo.unidadeMaisCritica}
          detail="maior saldo absoluto"
          icon={Activity}
          tone={resumo.unidadeMaisCritica !== "-" ? "orange" : "green"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <SecpChartCard
          title="Saldo de banco de horas por unidade"
          description="Comparativo do saldo liquido mensal, com valores positivos indicando crédito e negativos indicando deficit."
        >
          <SecpHorizontalBarChart
            data={saldosPorUnidade}
            color="#1d4ed8"
            valueSuffix="h"
          />
        </SecpChartCard>

        <SecpChartCard
          title="Faixas de risco"
          description="Distribuição de servidores por faixa de saldo e situação operacional."
          contentClassName="overflow-x-auto"
        >
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-3 font-bold">Faixa</th>
                <th className="px-3 py-3 text-right font-bold">Servidores</th>
                <th className="px-3 py-3 text-right font-bold">Horas</th>
                <th className="px-3 py-3 font-bold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {resumo.faixasRisco.map((item) => (
                <tr key={item.faixa} className="border-b last:border-b-0">
                  <td className="px-3 py-3 font-semibold">{item.faixa}</td>
                  <td className="px-3 py-3 text-right">{item.servidores}</td>
                  <td className="px-3 py-3 text-right font-bold">
                    {item.horasAcumuladas > 0 ? "+" : ""}
                    {formatarNumero(item.horasAcumuladas)}h
                  </td>
                  <td className="px-3 py-3">{formatarTextoPainel(item.situacao)}</td>
                </tr>
              ))}
              {resumo.faixasRisco.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                    Nenhum saldo de banco de horas encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Ranking de servidores críticos"
        description="Servidores com maior saldo absoluto, positivo ou negativo."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[58rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Servidor</th>
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 text-right font-bold">Saldo</th>
              <th className="px-3 py-3 font-bold">Vencimento</th>
              <th className="px-3 py-3 font-bold">Situação</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.rankingServidoresCriticos.map((item) => (
              <tr key={item.servidorId} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3 font-semibold">{item.servidor}</td>
                <td className="px-3 py-3">{item.unidade}</td>
                <td className="px-3 py-3 text-right font-bold">
                  {item.saldoHoras > 0 ? "+" : ""}
                  {formatarNumero(item.saldoHoras)}h
                </td>
                <td className="px-3 py-3">{item.vencimento}</td>
                <td className="px-3 py-3">
                  <span
                    className={[
                      "rounded px-2 py-1 text-xs font-bold",
                      item.situacao.includes("critico")
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : item.situacao === "Atencao"
                          ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100"
                          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                    ].join(" ")}
                  >
                    {formatarTextoPainel(item.situacao)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SecpChartCard>

      <SecpChartCard
        title="Extrato detalhado"
        description="Movimentos recentes de crédito, débito, compensação, ajuste ou homologação."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[66rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Data</th>
              <th className="px-3 py-3 font-bold">Servidor</th>
              <th className="px-3 py-3 font-bold">Unidade</th>
              <th className="px-3 py-3 text-right font-bold">Credito</th>
              <th className="px-3 py-3 text-right font-bold">Debito</th>
              <th className="px-3 py-3 text-right font-bold">Saldo acumulado</th>
              <th className="px-3 py-3 font-bold">Origem</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.extrato.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3">{item.data}</td>
                <td className="px-3 py-3 font-semibold">{item.servidor}</td>
                <td className="px-3 py-3">{item.unidade}</td>
                <td className="px-3 py-3 text-right">{item.creditoHoras > 0 ? `+${formatarNumero(item.creditoHoras)}h` : "-"}</td>
                <td className="px-3 py-3 text-right">{item.debitoHoras < 0 ? `${formatarNumero(item.debitoHoras)}h` : "-"}</td>
                <td className="px-3 py-3 text-right font-bold">{formatarNumero(item.saldoAcumuladoHoras)}h</td>
                <td className="px-3 py-3">{item.origem}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.extrato.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhum movimento encontrado para a competência selecionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function PainelGraficosImportantes({ dados }: { dados: PainelExecutivoDados }) {
  const resumo = dados.graficosImportantes;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Area mais crítica"
          value={resumo.areaMaisCritica}
          detail="maior pontuação no mês"
          icon={AlertTriangle}
          tone={resumo.areaMaisCritica !== "-" ? "red" : "green"}
        />
        <SecpKpiCard
          label="Gráficos críticos"
          value={resumo.totalCritico}
          detail="criticidade acima de 85"
          icon={Gauge}
          tone={resumo.totalCritico > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Prioridade maxima"
          value={resumo.prioridadeMaxima}
          detail="ciclo mensal do ponto"
          icon={CalendarDays}
          tone="orange"
        />
        <SecpKpiCard
          label="Pacote obrigatorio"
          value={resumo.obrigatorios}
          detail="gráficos minimos premium"
          icon={CheckCircle2}
          tone="green"
        />
      </section>

      <SecpChartCard
        title="Gráficos prioritarios do SECP"
        description="Ranking de criticidade dos indicadores executivos, operacionais e de conformidade do ponto eletronico."
      >
        <SecpHorizontalBarChart
          data={resumo.rankingCriticidade}
          color="#7c3aed"
        />
      </SecpChartCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <SecpChartCard
          title="Pacote minimo obrigatorio"
          description="Gráficos essenciais para fechamento mensal, controle operacional e ação imédiata."
          contentClassName="overflow-x-auto"
        >
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-3 font-bold">Grafico</th>
                <th className="px-3 py-3 font-bold">Nivel</th>
                <th className="px-3 py-3 text-right font-bold">Criticidade</th>
                <th className="px-3 py-3 text-right font-bold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {resumo.pacoteMinimo.map((item) => (
                <tr key={item.slug} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-3 font-semibold">{formatarTextoPainel(item.grafico)}</td>
                  <td className="px-3 py-3">{item.nivel}</td>
                  <td className="px-3 py-3 text-right font-bold">{formatarTextoPainel(String(item.criticidade))}</td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/painel-executivo/${item.slug}?competencia=${dados.competencia.valorInput}`}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SecpChartCard>

        <SecpChartCard
          title="Gráficos de apoio"
          description="Camadas adicionais para modalidade, tecnologia, governanca e auditoria."
          contentClassName="overflow-x-auto"
        >
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-3 font-bold">Grafico</th>
                <th className="px-3 py-3 font-bold">Prioridade</th>
                <th className="px-3 py-3 text-right font-bold">Criticidade</th>
                <th className="px-3 py-3 text-right font-bold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {resumo.graficosApoio.map((item) => (
                <tr key={item.slug} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-3 font-semibold">{formatarTextoPainel(item.grafico)}</td>
                  <td className="px-3 py-3">{formatarTextoPainel(item.prioridade)}</td>
                  <td className="px-3 py-3 text-right font-bold">{formatarTextoPainel(String(item.criticidade))}</td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/painel-executivo/${item.slug}?competencia=${dados.competencia.valorInput}`}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Ordem de implantação e leitura executiva"
        description="Sequencia recomendada para priorização, com tipo visual e motivo de negocio."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[72rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 text-right font-bold">Ordem</th>
              <th className="px-3 py-3 font-bold">Grafico</th>
              <th className="px-3 py-3 font-bold">Tipo</th>
              <th className="px-3 py-3 font-bold">Nivel</th>
              <th className="px-3 py-3 font-bold">Prioridade</th>
              <th className="px-3 py-3 text-right font-bold">Criticidade</th>
              <th className="px-3 py-3 font-bold">Motivo</th>
              <th className="px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.ordemImplantacao.map((item) => (
              <tr key={item.slug} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3 text-right font-bold">{item.ordem}</td>
                <td className="px-3 py-3 font-semibold">{formatarTextoPainel(item.grafico)}</td>
                <td className="px-3 py-3">{item.tipo}</td>
                <td className="px-3 py-3">{item.nivel}</td>
                <td className="px-3 py-3">{formatarTextoPainel(item.prioridade)}</td>
                <td className="px-3 py-3 text-right font-bold">{formatarTextoPainel(String(item.criticidade))}</td>
                <td className="px-3 py-3">{item.motivo}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/painel-executivo/${item.slug}?competencia=${dados.competencia.valorInput}`}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function PainelRelatoriosExportaveis({
  dados,
}: {
  dados: PainelExecutivoDados;
}) {
  const resumo = dados.relatoriosExportaveis;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Relatórios disponíveis"
          value={resumo.relatoriosDisponiveis}
          detail="catálogo oficial SECP"
          icon={Server}
          tone="blue"
        />
        <SecpKpiCard
          label="Exportações no mês"
          value={resumo.exportacoesMes}
          detail="eventos auditados"
          icon={Activity}
          tone={resumo.exportacoesMes > 0 ? "green" : "blue"}
        />
        <SecpKpiCard
          label="PDF gerados"
          value={resumo.pdfGerados}
          detail="documentos formais"
          icon={CheckCircle2}
          tone="green"
        />
        <SecpKpiCard
          label="XLSX gerados"
          value={resumo.xlsxGerados}
          detail="conferencia RH"
          icon={Gauge}
          tone="blue"
        />
        <SecpKpiCard
          label="CSV gerados"
          value={resumo.csvGerados}
          detail="integração e BI"
          icon={TrendingUp}
          tone="blue"
        />
        <SecpKpiCard
          label="Filtros sensíveis"
          value={resumo.exportacoesSensiveis}
          detail="espelho, banco ou auditoria"
          icon={AlertTriangle}
          tone={resumo.exportacoesSensiveis > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Exportações com erro"
          value={resumo.exportacoesComErro}
          detail="falhas registradas"
          icon={Clock3}
          tone={resumo.exportacoesComErro > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Mais usado"
          value={resumo.relatorioMaisUsado}
          detail="maior volume no mês"
          icon={CalendarDays}
          tone="blue"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <SecpChartCard
          title="Catálogo de relatórios"
          description="Relatórios oficiais, formatos permitidos, perfis autorizados, filtros e acoes de exportação."
        >
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="w-[30%] px-3 py-3 font-bold">Relatorio</th>
                <th className="w-[15%] px-3 py-3 font-bold">Formatos</th>
                <th className="w-[20%] px-3 py-3 font-bold">Perfil</th>
                <th className="w-[20%] px-3 py-3 font-bold">Filtros</th>
                <th className="w-[15%] px-3 py-3 text-right font-bold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {resumo.catalogo.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-3 align-top">
                    <div className="grid gap-1">
                      <span className="break-words font-semibold">{formatarTextoPainel(item.nome)}</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.finalidade}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.formatos.map((formato) => (
                        <span key={formato} className="rounded bg-muted px-2 py-1 text-xs font-bold">
                          {formato}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="break-words px-3 py-3 align-top">{item.perfilAutorizado}</td>
                  <td className="break-words px-3 py-3 align-top">{item.filtros}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {item.hrefPdf ? (
                        <Link
                          href={item.hrefPdf}
                          className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                        >
                          PDF
                        </Link>
                      ) : null}
                      {item.hrefCsv ? (
                        <Link
                          href={item.hrefCsv}
                          className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                        >
                          CSV
                        </Link>
                      ) : null}
                      <Link
                        href={item.hrefTela}
                        className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                      >
                        Abrir
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SecpChartCard>

        <SecpChartCard
          title="Relatórios mais exportados"
          description="Quantidade de exportações realizadas por tipo de relatorio na competência atual."
        >
          <SecpHorizontalBarChart
            data={resumo.rankingExportacoes}
            color="#1d4ed8"
          />
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Historico de exportações"
        description="Eventos auditados de exportação, com usuario, relatorio, filtros, formato e status."
        contentClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[66rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3 font-bold">Data/hora</th>
              <th className="px-3 py-3 font-bold">Usuario</th>
              <th className="px-3 py-3 font-bold">Relatorio</th>
              <th className="px-3 py-3 font-bold">Filtros</th>
              <th className="px-3 py-3 font-bold">Formato</th>
              <th className="px-3 py-3 font-bold">Status</th>
              <th className="px-3 py-3 text-right font-bold">Download</th>
            </tr>
          </thead>
          <tbody>
            {resumo.historico.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3">{item.dataHora}</td>
                <td className="px-3 py-3 font-semibold">{item.usuario}</td>
                <td className="px-3 py-3">{item.relatorio}</td>
                <td className="px-3 py-3">{item.filtros}</td>
                <td className="px-3 py-3">{item.formato}</td>
                <td className="px-3 py-3">{formatarTextoPainel(item.status)}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Auditoria
                  </Link>
                </td>
              </tr>
            ))}
            {resumo.historico.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm font-medium text-muted-foreground">
                  Nenhuma exportação auditada para a competência selecionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function PainelPaineis({ dados }: { dados: PainelExecutivoDados }) {
  const resumo = dados.paineis;
  const situacaoClasses: Record<string, string> = {
    Critico: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    Atencao:
      "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    Monitorar: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    Regular:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  };
  const prioridadeClasses: Record<string, string> = {
    Maxima: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
    Alta: "bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    "Media-alta":
      "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecpKpiCard
          label="Painéis disponíveis"
          value={resumo.totalPaineis}
          detail="catálogo executivo"
          icon={Server}
          tone="blue"
        />
        <SecpKpiCard
          label="Painéis críticos"
          value={resumo.paineisCriticos}
          detail="prioridade acima de 85"
          icon={AlertTriangle}
          tone={resumo.paineisCriticos > 0 ? "red" : "green"}
        />
        <SecpKpiCard
          label="Acoes pendentes"
          value={resumo.acoesPendentes}
          detail="pendências, alertas e homologação"
          icon={Activity}
          tone={resumo.acoesPendentes > 0 ? "orange" : "green"}
        />
        <SecpKpiCard
          label="Relatórios disponíveis"
          value={resumo.relatoriosDisponiveis}
          detail="modelos exportáveis"
          icon={CheckCircle2}
          tone="green"
        />
        <SecpKpiCard
          label="Última atualização"
          value={resumo.ultimaAtualizacao}
          detail="dados da competência"
          icon={CalendarDays}
          tone="blue"
        />
        <SecpKpiCard
          label="Perfis com acesso"
          value={resumo.perfisComAcesso}
          detail="visoes por responsabilidade"
          icon={UsersRound}
          tone="blue"
        />
        <SecpKpiCard
          label="Painel prioritario"
          value={resumo.painelMaisPrioritario}
          detail="maior pontuação atual"
          icon={Gauge}
          tone={resumo.paineisCriticos > 0 ? "red" : "orange"}
        />
        <SecpKpiCard
          label="Competência"
          value={dados.competencia.rotulo}
          detail={dados.escopo.descricao}
          icon={TrendingUp}
          tone="blue"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]">
        <SecpChartCard
          title="Prioridade dos painéis do SECP"
          description="Ranking dos painéis que exigem maior atenção operacional na competência atual."
        >
          <SecpHorizontalBarChart
            data={resumo.rankingPrioridade}
            color="#7c3aed"
          />
        </SecpChartCard>

        <SecpChartCard
          title="Atalhos inteligentes"
          description="Acoes executivas para acessar rapidamente os principais gargalos do mês."
        >
          <div className="grid gap-3">
            {resumo.atalhos.map((atalho) => (
              <Link
                key={atalho.href}
                href={atalho.href}
                className="rounded-md border border-border bg-background p-3 transition hover:bg-muted"
              >
                <span className="block text-sm font-bold text-foreground">
                  {formatarTextoPainel(atalho.label)}
                </span>
                <span className="mt-1 block text-xs font-medium text-muted-foreground">
                  {formatarTextoPainel(atalho.detalhe)}
                </span>
              </Link>
            ))}
          </div>
        </SecpChartCard>
      </section>

      <SecpChartCard
        title="Catálogo de painéis"
        description="Painéis organizados por finalidade, perfil autorizado, situação operacional e prioridade."
      >
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="w-[25%] px-3 py-3 font-bold">Painel</th>
              <th className="w-[15%] px-3 py-3 font-bold">Grupo</th>
              <th className="w-[15%] px-3 py-3 font-bold">Perfil</th>
              <th className="w-[13%] px-3 py-3 font-bold">Situação</th>
              <th className="w-[13%] px-3 py-3 font-bold">Prioridade</th>
              <th className="w-[11%] px-3 py-3 text-right font-bold">Score</th>
              <th className="w-[8%] px-3 py-3 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {resumo.catalogo.map((item) => (
              <tr key={item.slug} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-3 align-top">
                  <div className="grid gap-1">
                    <span className="break-words font-semibold">{item.painel}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.finalidade}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {formatarTextoPainel(item.indicadorPrincipal)}
                    </span>
                  </div>
                </td>
                <td className="break-words px-3 py-3 align-top">{formatarTextoPainel(item.grupo)}</td>
                <td className="break-words px-3 py-3 align-top">
                  {item.perfilAutorizado}
                </td>
                <td className="px-3 py-3 align-top">
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-1 text-xs font-bold",
                      situacaoClasses[item.situacao],
                    ].join(" ")}
                  >
                    {formatarTextoPainel(item.situacao)}
                  </span>
                </td>
                <td className="px-3 py-3 align-top">
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-1 text-xs font-bold",
                      prioridadeClasses[item.prioridade],
                    ].join(" ")}
                  >
                    {formatarTextoPainel(item.prioridade)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right align-top font-bold">
                  {item.pontuacaoPrioridade}
                </td>
                <td className="px-3 py-3 text-right align-top">
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-bold hover:bg-muted"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SecpChartCard>
    </div>
  );
}

function escolherGraficos(
  slug: string,
  dados: PainelExecutivoDados,
): Array<{ key: string; node: React.ReactNode; span?: "wide" }> {
  const comuns = {
    evolucao: (
      <LineAreaChart
        titulo="Evolução diária: regularidade x pendências"
        dados={dados.evolucaoDiaria}
      />
    ),
    resultados: (
      <DonutChart
        titulo="Distribuicao da apuracao diaria"
        dados={dados.apuracaoPorResultado}
      />
    ),
    homologacao: (
      <DonutChart
        titulo="Status da homologação mensal"
        dados={dados.homologacaoPorStatus}
      />
    ),
    ocorrencias: (
      <HorizontalBarChart
        titulo="Ocorrências de frequência por tipo"
        dados={dados.ocorrenciasPorTipo}
      />
    ),
    unidades: (
      <HorizontalBarChart
        titulo="Unidades com maior volume de ocorrencias"
        dados={dados.ocorrenciasPorUnidade}
      />
    ),
    banco: (
      <HorizontalBarChart
        titulo="Movimentos de banco de horas"
        dados={dados.bancoHorasPorTipo}
        sufixo="h"
      />
    ),
    saldos: (
      <HorizontalBarChart
        titulo="Maiores saldos de banco de horas"
        dados={dados.maioresSaldosBancoHoras}
        sufixo="h"
      />
    ),
    solicitacoesStatus: (
      <DonutChart
        titulo="Solicitacoes por status"
        dados={dados.solicitacoesPorStatus}
      />
    ),
    solicitacoesTipo: (
      <HorizontalBarChart
        titulo="Solicitacoes por tipo"
        dados={dados.solicitacoesPorTipo}
      />
    ),
    fontes: (
      <DonutChart titulo="Origem das marcacoes" dados={dados.marcacoesPorFonte} />
    ),
    equipamentos: (
      <DonutChart
        titulo="Saude dos equipamentos"
        dados={dados.equipamentosPorStatus}
      />
    ),
    eventosEquipamento: (
      <HorizontalBarChart
        titulo="Eventos recebidos dos equipamentos"
        dados={dados.eventosEquipamentoPorTipo}
      />
    ),
  };

  const porSecao: Record<string, Array<{ key: string; node: React.ReactNode; span?: "wide" }>> = {
    indicadores: [
      { key: "evolucao", node: comuns.evolucao, span: "wide" },
      { key: "resultados", node: comuns.resultados },
      { key: "homologacao", node: comuns.homologacao },
    ],
    "pendencias-de-ponto": [
      { key: "ocorrencias", node: comuns.ocorrencias },
      { key: "unidades", node: comuns.unidades },
      { key: "evolucao", node: comuns.evolucao, span: "wide" },
    ],
    "frequencia-e-assiduidade": [
      { key: "resultados", node: comuns.resultados },
      { key: "fontes", node: comuns.fontes },
      { key: "evolucao", node: comuns.evolucao, span: "wide" },
    ],
    "justificativas-e-ocorrencias": [
      { key: "solicitacoesStatus", node: comuns.solicitacoesStatus },
      { key: "solicitacoesTipo", node: comuns.solicitacoesTipo },
      { key: "ocorrencias", node: comuns.ocorrencias },
    ],
    "controle-de-homologacao-mensal": [
      { key: "homologacao", node: comuns.homologacao },
      { key: "unidades", node: comuns.unidades },
      { key: "evolucao", node: comuns.evolucao, span: "wide" },
    ],
    "jornada-e-carga-horaria": [
      { key: "banco", node: comuns.banco },
      { key: "saldos", node: comuns.saldos },
      { key: "resultados", node: comuns.resultados },
    ],
    "teletrabalho-presencial-registro-web": [
      { key: "fontes", node: comuns.fontes },
      { key: "resultados", node: comuns.resultados },
      { key: "evolucao", node: comuns.evolucao, span: "wide" },
    ],
    "equipamentos-de-ponto": [
      { key: "equipamentos", node: comuns.equipamentos },
      { key: "eventosEquipamento", node: comuns.eventosEquipamento },
      { key: "fontes", node: comuns.fontes },
    ],
    "auditoria-e-conformidade": [
      { key: "ocorrencias", node: comuns.ocorrencias },
      { key: "solicitacoesStatus", node: comuns.solicitacoesStatus },
      { key: "eventosEquipamento", node: comuns.eventosEquipamento },
    ],
    "indicadores-por-unidade-e-chefia": [
      { key: "unidades", node: comuns.unidades },
      { key: "homologacao", node: comuns.homologacao },
      { key: "evolucao", node: comuns.evolucao, span: "wide" },
    ],
    "alertas-inteligentes": [
      { key: "ocorrencias", node: comuns.ocorrencias },
      { key: "equipamentos", node: comuns.equipamentos },
      { key: "saldos", node: comuns.saldos },
    ],
    "relatorios-exportaveis": [
      { key: "homologacao", node: comuns.homologacao },
      { key: "resultados", node: comuns.resultados },
      { key: "solicitacoesStatus", node: comuns.solicitacoesStatus },
    ],
    paineis: [
      { key: "evolucao", node: comuns.evolucao, span: "wide" },
      { key: "homologacao", node: comuns.homologacao },
      { key: "ocorrencias", node: comuns.ocorrencias },
    ],
    "graficos-importantes": [
      { key: "evolucao", node: comuns.evolucao, span: "wide" },
      { key: "unidades", node: comuns.unidades },
      { key: "saldos", node: comuns.saldos },
    ],
    "banco-de-horas": [
      { key: "banco", node: comuns.banco },
      { key: "saldos", node: comuns.saldos },
      { key: "homologacao", node: comuns.homologacao },
    ],
  };

  return porSecao[slug] ?? porSecao.indicadores;
}

export function PainelExecutivoPage({
  painel,
  permissao,
  dados,
}: PainelExecutivoPageProps) {
  const perfilCodigo = permissao.perfilAtivoCodigo?.toUpperCase();
  const secoesVisiveis = paineisExecutivos.filter((secao) =>
    podeVerPainel(secao, permissao.permissoes, perfilCodigo),
  );
  const Icon = painel.icon;
  const graficos = escolherGraficos(painel.slug, dados);
  const exibirIndicadoresExecutivos = painel.slug === "indicadores";
  const exibirPendênciasPonto = painel.slug === "pendencias-de-ponto";
  const exibirFrequênciaAssiduidade =
    painel.slug === "frequencia-e-assiduidade";
  const exibirJustificativasAssiduidade =
    painel.slug === "justificativas-e-ocorrencias";
  const exibirHomologacaoMensal =
    painel.slug === "controle-de-homologacao-mensal";
  const exibirJornadaCargaHoraria = painel.slug === "jornada-e-carga-horaria";
  const exibirTeletrabalhoRegistroWeb =
    painel.slug === "teletrabalho-presencial-registro-web";
  const exibirEquipamentosPonto = painel.slug === "equipamentos-de-ponto";
  const exibirAuditoriaConformidade =
    painel.slug === "auditoria-e-conformidade";
  const exibirIndicadoresUnidadeChefia =
    painel.slug === "indicadores-por-unidade-e-chefia";
  const exibirAlertasInteligentes = painel.slug === "alertas-inteligentes";
  const exibirBancoHoras = painel.slug === "banco-de-horas";
  const exibirGraficosImportantes = painel.slug === "graficos-importantes";
  const exibirRelatoriosExportaveis = painel.slug === "relatorios-exportaveis";
  const exibirPaineis = painel.slug === "paineis";

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Painel Executivo", href: "/painel-executivo" },
          { label: painel.menuLabel },
        ]}
      />

      <PageHeader
        icon={Icon}
        titulo={painel.titulo}
        descricao={painel.descricao}
        artigo="Gestao executiva"
        regraTitulo="Dados reais da competencia"
        regraDescricao="Os indicadores consolidam registros de apuracao, homologacao, marcacoes, solicitacoes, banco de horas e equipamentos."
        actions={
          <form className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              Competência
              <input
                type="month"
                name="competencia"
                defaultValue={dados.competencia.valorInput}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-900/30"
            >
              <Filter className="size-4" aria-hidden="true" />
              Filtrar
            </button>
          </form>
        }
      />

      <section className="rounded-md border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Submenus do Painel Executivo
            </p>
            <h2 className="mt-1 text-lg font-bold">
              Escolha uma visão executiva
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <CalendarDays className="size-4" aria-hidden="true" />
            {dados.competencia.rotulo}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {secoesVisiveis.map((secao) => {
            const ativo = secao.slug === painel.slug;
            const SecaoIcon = secao.icon;

            return (
              <Link
                key={secao.slug}
                href={`/painel-executivo/${secao.slug}?competencia=${dados.competencia.valorInput}`}
                aria-current={ativo ? "page" : undefined}
                className={[
                  "group grid min-h-28 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border p-3 transition",
                  ativo
                    ? "border-blue-900 bg-blue-900 text-white shadow-card"
                    : "border-border bg-background hover:border-blue-200 hover:bg-blue-50/60 dark:hover:border-blue-900 dark:hover:bg-blue-950/30",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-10 shrink-0 items-center justify-center rounded-md",
                    ativo
                      ? "bg-white/15 text-white"
                      : "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
                  ].join(" ")}
                >
                  <SecaoIcon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-5">
                    {secao.menuLabel}
                  </span>
                  <span
                    className={[
                      "mt-1 line-clamp-2 block text-xs font-medium leading-5",
                      ativo ? "text-white/80" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {secao.descricao}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-3 inline-flex rounded-md bg-muted/70 px-3 py-2 text-xs font-semibold text-muted-foreground">
          Escopo: {dados.escopo.descricao}
        </div>
      </section>

      {exibirIndicadoresExecutivos ? (
        <PainelIndicadoresExecutivos dados={dados} />
      ) : exibirPendênciasPonto ? (
        <PainelPendênciasPonto dados={dados} />
      ) : exibirFrequênciaAssiduidade ? (
        <PainelFrequênciaAssiduidade dados={dados} />
      ) : exibirJustificativasAssiduidade ? (
        <PainelJustificativasAssiduidade dados={dados} />
      ) : exibirHomologacaoMensal ? (
        <PainelHomologacaoMensal dados={dados} />
      ) : exibirJornadaCargaHoraria ? (
        <PainelJornadaCargaHoraria dados={dados} />
      ) : exibirTeletrabalhoRegistroWeb ? (
        <PainelTeletrabalhoRegistroWeb dados={dados} />
      ) : exibirEquipamentosPonto ? (
        <PainelEquipamentosPonto dados={dados} />
      ) : exibirAuditoriaConformidade ? (
        <PainelAuditoriaConformidade dados={dados} />
      ) : exibirIndicadoresUnidadeChefia ? (
        <PainelIndicadoresUnidadeChefia dados={dados} />
      ) : exibirAlertasInteligentes ? (
        <PainelAlertasInteligentes dados={dados} />
      ) : exibirBancoHoras ? (
        <PainelBancoHoras dados={dados} />
      ) : exibirGraficosImportantes ? (
        <PainelGraficosImportantes dados={dados} />
      ) : exibirRelatoriosExportaveis ? (
        <PainelRelatoriosExportaveis dados={dados} />
      ) : exibirPaineis ? (
        <PainelPaineis dados={dados} />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Servidores ativos"
              valor={dados.metricas.servidoresAtivos}
              detalhe="base institucional ativa"
              icon={UsersRound}
            />
            <MetricCard
              label="Regularidade"
              valor={`${dados.metricas.regularidadePercentual}%`}
              detalhe={`${formatarNumero(dados.metricas.apuracoesCalculadas)} apuracoes`}
              icon={Gauge}
              tone="green"
            />
            <MetricCard
              label="Pendências abertas"
              valor={dados.metricas.ocorrenciasAbertas}
              detalhe="ocorrencias nao resolvidas"
              icon={AlertTriangle}
              tone={dados.metricas.ocorrenciasAbertas > 0 ? "red" : "green"}
            />
            <MetricCard
              label="Homologados"
              valor={dados.metricas.homologacoesHomologadas}
              detalhe={`${formatarNumero(dados.metricas.homologacoesPendentes)} pendente(s)`}
              icon={CheckCircle2}
              tone="green"
            />
            <MetricCard
              label="Saldo banco de horas"
              valor={`${formatarNumero(dados.metricas.saldoBancoHorasHoras)}h`}
              detalhe="saldo agregado atual"
              icon={Clock3}
              tone="orange"
            />
            <MetricCard
              label="Equipamentos offline"
              valor={dados.metricas.equipamentosOffline}
              detalhe="sem heartbeat nas ultimas 24h"
              icon={Server}
              tone={dados.metricas.equipamentosOffline > 0 ? "red" : "green"}
            />
            <MetricCard
              label="Marcações por origem"
              valor={totalSerie(dados.marcacoesPorFonte)}
              detalhe="marcacoes validas no mes"
              icon={Activity}
            />
            <MetricCard
              label="Solicitações"
              valor={totalSerie(dados.solicitacoesPorStatus)}
              detalhe="criadas na competencia"
              icon={painel.icon}
              tone="orange"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            {graficos.map((grafico) => (
              <div
                key={grafico.key}
                className={grafico.span === "wide" ? "xl:col-span-2" : undefined}
              >
                {grafico.node}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

