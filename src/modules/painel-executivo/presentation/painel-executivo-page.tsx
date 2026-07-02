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
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import type { ResultadoPermissao } from "@/modules/auth/application/services/permissao.service";
import type {
  PainelExecutivoDados,
  SerieDupla,
  SerieValor,
} from "@/modules/painel-executivo/infrastructure/repositories/painel-executivo.repository";
import {
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
    permissoes.includes(painel.permissao)
  );
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(valor);
}

function totalSerie(dados: SerieValor[]) {
  return dados.reduce((total, item) => total + item.valor, 0);
}

function serieVazia(dados: SerieValor[] | SerieDupla[]) {
  return dados.length === 0 || dados.every((item) => item.valor === 0);
}

function EmptyChart() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-4 text-center text-sm font-medium text-muted-foreground">
      Sem dados registrados para a competencia selecionada.
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
  const linhaPendencias = dados
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
              points={linhaPendencias}
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
              Com pendencia
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

function escolherGraficos(
  slug: string,
  dados: PainelExecutivoDados,
): Array<{ key: string; node: React.ReactNode; span?: "wide" }> {
  const comuns = {
    evolucao: (
      <LineAreaChart
        titulo="Evolucao diaria: regularidade x pendencias"
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
        titulo="Status da homologacao mensal"
        dados={dados.homologacaoPorStatus}
      />
    ),
    ocorrencias: (
      <HorizontalBarChart
        titulo="Ocorrencias de frequencia por tipo"
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
              Competencia
              <input
                type="month"
                name="competencia"
                defaultValue={dados.competencia.valorInput}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold transition hover:bg-muted"
            >
              <Filter className="size-4" aria-hidden="true" />
              Filtrar
            </button>
          </form>
        }
      />

      <section className="grid gap-3 rounded-md border border-border bg-card p-4 shadow-card lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Submenus do Painel Executivo
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {secoesVisiveis.map((secao) => {
              const ativo = secao.slug === painel.slug;

              return (
                <Link
                  key={secao.slug}
                  href={`/painel-executivo/${secao.slug}?competencia=${dados.competencia.valorInput}`}
                  className={[
                    "whitespace-nowrap rounded-md border px-3 py-2 text-xs font-semibold transition",
                    ativo
                      ? "border-blue-900 bg-blue-900 text-white"
                      : "border-border hover:bg-muted",
                  ].join(" ")}
                >
                  {secao.menuLabel}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden="true" />
          {dados.competencia.rotulo}
        </div>
      </section>

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
          label="Pendencias abertas"
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
          label="Marcacoes por origem"
          valor={totalSerie(dados.marcacoesPorFonte)}
          detalhe="marcacoes validas no mes"
          icon={Activity}
        />
        <MetricCard
          label="Solicitacoes"
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
    </div>
  );
}
