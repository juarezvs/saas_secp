import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Hourglass,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import {
  BancoHorasCompetenciaAutoForm,
  BancoHorasFiltrosAuto,
} from "./banco-horas-filtros-auto";
import { BancoHorasEvolucaoChart } from "./banco-horas-evolucao-chart";
import {
  gerarMovimentosBancoHorasAction,
} from "../../application/actions/gerar-movimento-banco-horas.action";
import { expirarDebitosVencidosAction } from "../../application/actions/expirar-debitos-vencidos.action";
import { recalcularSaldoBancoHorasAction } from "../../application/actions/recalcular-saldo-banco-horas.action";
import {
  formatarDataCivilBancoHoras,
  minutosParaHoraBanco,
  rotuloOrigemMovimentoBancoHoras,
  rotuloStatusMovimentoBancoHoras,
  rotuloTipoMovimentoBancoHoras,
} from "../../application/services/formatar-banco-horas.service";

type ServidorBancoHoras = {
  id: string;
  matricula: string;
  nomeFuncional?: string | null;
  usuario: { nome: string };
  bancoHorasSaldo: {
    saldoMinutos: number;
    creditosValidadosMinutos: number;
    debitosValidadosMinutos: number;
    creditosPendentesMinutos: number;
    debitosPendentesMinutos: number;
    horasAcimaLimiteMinutos: number;
    horasNaoAutorizadasMinutos: number;
  } | null;
  lotacoes?: Array<{ unidade: { sigla: string; nome: string } }>;
};

type MovimentoBancoHoras = {
  id: string;
  dataReferencia: Date;
  mesReferencia: number;
  anoReferencia: number;
  tipo: string;
  origem: string;
  status: string;
  minutos: number;
  descricao: string | null;
  expiraEm: Date | null;
  metadados?: unknown;
};

type AutorizacaoBancoHoras = {
  id: string;
  tipo: string;
  status: string;
  dataInicio: Date;
  dataFim: Date;
  minutosAutorizados: number;
  autorizadoEm: Date;
  autorizadoPor: { nome: string };
  solicitacao: { id: string; titulo: string };
  movimentos: Array<{ minutos: number }>;
};

type BancoHorasPageRealProps = {
  servidores: ServidorBancoHoras[];
  servidorSelecionado: ServidorBancoHoras | null;
  movimentos: MovimentoBancoHoras[];
  movimentosComposicaoSaldo: MovimentoBancoHoras[];
  autorizacoes: AutorizacaoBancoHoras[];
  anoReferencia: number;
  mesReferencia: number;
  podeSelecionarServidor: boolean;
  podeGerenciar: boolean;
  perfilAtivoCodigo?: string;
  extratoSelecionado?: string;
  competenciaDetalhada?: string;
};

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function saldoPadrao(saldo: ServidorBancoHoras["bancoHorasSaldo"]) {
  return (
    saldo ?? {
      saldoMinutos: 0,
      creditosValidadosMinutos: 0,
      debitosValidadosMinutos: 0,
      creditosPendentesMinutos: 0,
      debitosPendentesMinutos: 0,
      horasAcimaLimiteMinutos: 0,
      horasNaoAutorizadasMinutos: 0,
    }
  );
}

function competenciaInput(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function moverMes(ano: number, mes: number, delta: number) {
  const data = new Date(Date.UTC(ano, mes - 1 + delta, 1));
  return {
    ano: data.getUTCFullYear(),
    mes: data.getUTCMonth() + 1,
  };
}

function hrefCompetencia(params: {
  ano: number;
  mes: number;
  servidorId?: string;
}) {
  const query = new URLSearchParams({
    competencia: competenciaInput(params.ano, params.mes),
  });

  if (params.servidorId) {
    query.set("servidorId", params.servidorId);
  }

  return `/banco-horas?${query.toString()}`;
}

function somar(
  movimentos: MovimentoBancoHoras[],
  filtro: (movimento: MovimentoBancoHoras) => boolean,
) {
  return movimentos
    .filter(filtro)
    .reduce((total, movimento) => total + movimento.minutos, 0);
}

function ehCredito(tipo: string) {
  return ["CREDITO", "COMPENSACAO_DEBITO"].includes(tipo);
}

function ehDebito(tipo: string) {
  return ["DEBITO", "COMPENSACAO_CREDITO"].includes(tipo);
}

function dataInicio(data: Date) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

function diasAte(data: Date | null) {
  if (!data) return null;
  const hoje = dataInicio(new Date());
  const alvo = dataInicio(data);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

function movimentosAExpirar(movimentos: MovimentoBancoHoras[]) {
  const hoje = dataInicio(new Date());

  return movimentos
    .filter(
      (movimento) =>
        movimento.expiraEm &&
        ["PENDENTE", "VALIDADO"].includes(movimento.status) &&
        dataInicio(movimento.expiraEm) >= hoje,
    )
    .sort((a, b) => (a.expiraEm?.getTime() ?? 0) - (b.expiraEm?.getTime() ?? 0));
}

function classeStatus(status: string) {
  if (status === "VALIDADO") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDENTE") return "bg-amber-50 text-amber-700";
  if (status === "EXPIRADO") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function KPI({
  icon: Icon,
  titulo,
  valor,
  detalhe,
  sub,
  tone,
}: {
  icon: LucideIcon;
  titulo: string;
  valor: string;
  detalhe: string;
  sub?: string;
  tone: "green" | "red" | "purple" | "orange";
}) {
  const toneClass = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    purple: "bg-violet-100 text-violet-700",
    orange: "bg-orange-100 text-orange-700",
  }[tone];

  return (
    <article className="flex min-h-24 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black text-slate-500">{titulo}</p>
        <p className="mt-1 text-2xl font-black leading-none text-blue-950">{valor}</p>
        <p className="mt-2 text-xs font-bold text-slate-500">{detalhe}</p>
        {sub ? <p className="mt-0.5 text-xs font-bold text-emerald-700">{sub}</p> : null}
      </div>
    </article>
  );
}

function BancoHorasHeader({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <section className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100">
          <Hourglass className="size-5" aria-hidden="true" />
        </div>
        <h1 className="min-w-0 text-xl font-black leading-none tracking-normal text-slate-950 dark:text-slate-50">
          {titulo}
        </h1>
        <p className="col-start-2 mt-0.5 max-w-4xl text-[11px] leading-4 text-slate-500">
          {descricao}
        </p>
      </div>
    </section>
  );
}

function evolucaoSaldo(
  movimentosComposicaoSaldo: MovimentoBancoHoras[],
  anoReferencia: number,
  mesReferencia: number,
) {
  const pontos = Array.from({ length: 7 }, (_item, indice) =>
    moverMes(anoReferencia, mesReferencia, indice - 6),
  );

  return pontos.map(({ ano, mes }) => {
    const saldo = somar(
      movimentosComposicaoSaldo,
      (movimento) =>
        movimento.status !== "DESCONSIDERADO" &&
        (movimento.anoReferencia < ano ||
          (movimento.anoReferencia === ano && movimento.mesReferencia <= mes)),
    );

    return {
      label: `${meses[mes - 1].slice(0, 3)}/${ano}`,
      valor: saldo,
    };
  });
}

function EvolucaoCard({
  movimentos,
  anoReferencia,
  mesReferencia,
}: {
  movimentos: MovimentoBancoHoras[];
  anoReferencia: number;
  mesReferencia: number;
}) {
  const pontos = evolucaoSaldo(movimentos, anoReferencia, mesReferencia);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-blue-950">
          <BarChart3 className="size-5 text-blue-700" aria-hidden="true" />
          Evolução do saldo
        </h2>
        <span className="rounded-lg border px-3 py-1 text-xs font-bold text-blue-700">
          Últimos 7 meses
        </span>
      </div>
      <BancoHorasEvolucaoChart data={pontos} />
    </section>
  );
}

function ComposicaoCard({
  saldo,
}: {
  saldo: ReturnType<typeof saldoPadrao>;
}) {
  const itens = [
    { label: "Créditos regulares", valor: saldo.creditosValidadosMinutos, color: "bg-blue-500" },
    { label: "Horas extras autorizadas", valor: saldo.creditosPendentesMinutos, color: "bg-emerald-500" },
    { label: "Compensações utilizadas", valor: Math.abs(saldo.debitosValidadosMinutos), color: "bg-violet-500" },
    { label: "Ajustes administrativos", valor: Math.abs(saldo.horasAcimaLimiteMinutos), color: "bg-amber-500" },
    { label: "Débitos", valor: Math.abs(saldo.debitosPendentesMinutos), color: "bg-rose-500" },
  ];
  const total = itens.reduce((acc, item) => acc + Math.abs(item.valor), 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="inline-flex items-center gap-2 text-base font-black text-blue-950">
        <Hourglass className="size-5 text-blue-700" aria-hidden="true" />
        Composição do saldo
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-[10rem_1fr] md:items-center">
        <div className="relative mx-auto grid size-36 place-items-center rounded-full bg-[conic-gradient(#2563eb_0_54%,#10b981_54%_71%,#8b5cf6_71%_82%,#f59e0b_82%_88%,#f43f5e_88%_100%)]">
          <div className="grid size-28 place-items-center rounded-full bg-white text-center">
            <div>
              <p className="text-xl font-black leading-none text-blue-950">
                {minutosParaHoraBanco(saldo.saldoMinutos).replace(":", "h ")}
              </p>
              <p className="mt-1 text-[10px] font-bold leading-3 text-slate-500">Saldo atual</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {itens.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className={`size-3 rounded-full ${item.color}`} />
              <span className="min-w-0 flex-1 text-slate-600">{item.label}</span>
              <span className="font-black text-blue-950">
                {total > 0 ? Math.round((Math.abs(item.valor) / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrazoCard({ movimentos }: { movimentos: MovimentoBancoHoras[] }) {
  const prazos = movimentosAExpirar(movimentos).slice(0, 3);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-blue-950">
          <Clock3 className="size-5 text-blue-700" aria-hidden="true" />
          Prazos regulamentares
        </h2>
        <Link href="/banco-horas/vencimentos" className="text-xs font-black text-blue-700">
          Ver todos
        </Link>
      </div>
      <div className="mt-3 divide-y divide-slate-100">
        {prazos.map((movimento) => {
          const dias = diasAte(movimento.expiraEm);
          const urgente = dias !== null && dias <= 30;
          return (
            <Link
              key={movimento.id}
              href="/banco-horas/vencimentos"
              className="grid grid-cols-[9rem_1fr_7rem_1.5rem] items-center gap-3 py-3 text-sm"
            >
              <span className={`font-black ${urgente ? "text-rose-600" : "text-blue-700"}`}>
                {minutosParaHoraBanco(Math.abs(movimento.minutos))}
              </span>
              <span>
                <span className="block font-bold text-blue-950">
                  {rotuloTipoMovimentoBancoHoras(movimento.tipo)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Referência: {meses[movimento.mesReferencia - 1]}/{movimento.anoReferencia}
                </span>
              </span>
              <span className="font-semibold text-slate-600">
                {formatarDataCivilBancoHoras(movimento.expiraEm)}
              </span>
              <ChevronRight className="size-4 text-blue-700" aria-hidden="true" />
            </Link>
          );
        })}
        {prazos.length === 0 ? (
          <p className="py-6 text-sm font-medium text-slate-500">
            Nenhum prazo regulamentar em aberto.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AcoesRapidas({
  servidorId,
  anoReferencia,
  mesReferencia,
  podeGerenciar,
}: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  podeGerenciar: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="inline-flex items-center gap-2 text-base font-black text-blue-950">
        <CalendarCheck className="size-5 text-blue-700" aria-hidden="true" />
        Ações rápidas
      </h2>
      <div className="mt-3 space-y-2">
        <QuickLink href="/banco-horas/solicitacoes" icon={CalendarCheck} title="Solicitar compensação" desc="Registrar compensação de horas" tone="green" />
        <QuickLink href="/banco-horas/solicitacoes" icon={Calendar} title="Solicitar folga" desc="Usar saldo de banco de horas" tone="purple" />
        <QuickLink href="/banco-horas/relatorios" icon={FileText} title="Ver regras" desc="Consultar normativos e orientações" tone="blue" />
        <a
          href={`/api/relatorios/banco-horas/${servidorId}/pdf?ano=${anoReferencia}&mes=${mesReferencia}`}
          className="flex w-full items-center gap-3 rounded-xl bg-blue-50 p-3 text-left text-blue-700 transition hover:bg-blue-100"
        >
          <Download className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">Exportar extrato</span>
            <span className="block text-xs font-semibold text-slate-500">Gerar relatório em PDF</span>
          </span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
        {podeGerenciar ? (
          <div className="grid gap-2 pt-2">
            <AdminAction action={gerarMovimentosBancoHorasAction} servidorId={servidorId} anoReferencia={anoReferencia} mesReferencia={mesReferencia} label="Gerar movimentos" />
            <AdminAction action={recalcularSaldoBancoHorasAction} servidorId={servidorId} label="Recalcular saldo" />
            <AdminAction action={expirarDebitosVencidosAction} servidorId={servidorId} label="Expirar débitos vencidos" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AdminAction({
  action,
  servidorId,
  anoReferencia,
  mesReferencia,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  servidorId: string;
  anoReferencia?: number;
  mesReferencia?: number;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="servidorId" value={servidorId} />
      {anoReferencia ? <input type="hidden" name="anoReferencia" value={anoReferencia} /> : null}
      {mesReferencia ? <input type="hidden" name="mesReferencia" value={mesReferencia} /> : null}
      <button className="h-9 w-full rounded-lg border px-3 text-xs font-bold text-blue-700 hover:bg-blue-50">
        {label}
      </button>
    </form>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  desc,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tone: "green" | "purple" | "blue";
}) {
  const color =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "purple"
        ? "bg-violet-50 text-violet-700"
        : "bg-blue-50 text-blue-700";

  return (
    <Link href={href} className={`flex items-center gap-3 rounded-xl p-3 transition hover:brightness-95 ${color}`}>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{title}</span>
        <span className="block text-xs font-semibold text-slate-500">{desc}</span>
      </span>
      <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

function AlertasCard({
  creditosAVencer,
  pendentes,
  saldoMinutos,
}: {
  creditosAVencer: number;
  pendentes: number;
  saldoMinutos: number;
}) {
  const alertas = [
    {
      titulo: `${minutosParaHoraBanco(creditosAVencer)} a vencer`,
      desc: "Você possui horas que vencem em prazo regulamentar.",
      icon: AlertTriangle,
      badge: "Atenção",
      tone: "rose",
      show: creditosAVencer > 0,
    },
    {
      titulo: `${pendentes} solicitações pendentes`,
      desc: "Solicitações de compensação aguardam aprovação.",
      icon: AlertCircle,
      badge: "Pendente",
      tone: "amber",
      show: pendentes > 0,
    },
    {
      titulo: saldoMinutos >= 0 ? "Saldo positivo" : "Saldo negativo",
      desc: saldoMinutos >= 0
        ? "Seu saldo está dentro do limite regulamentar."
        : "Há débitos pendentes de compensação.",
      icon: Clock3,
      badge: saldoMinutos >= 0 ? "Regular" : "Atenção",
      tone: saldoMinutos >= 0 ? "blue" : "rose",
      show: true,
    },
  ].filter((item) => item.show);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-blue-950">
          <Bell className="size-5 text-blue-700" aria-hidden="true" />
          Próximas ações e atenções
        </h2>
        <Link href="/banco-horas/solicitacoes" className="text-xs font-black text-blue-700">
          Ver todas
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {alertas.map((alerta) => {
          const Icon = alerta.icon;
          const color =
            alerta.tone === "rose"
              ? "bg-rose-50 text-rose-700"
              : alerta.tone === "amber"
                ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700";
          return (
            <div key={alerta.titulo} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className={`grid size-9 place-items-center rounded-full ${color}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-blue-950">{alerta.titulo}</span>
                <span className="block text-xs font-semibold text-slate-500">{alerta.desc}</span>
              </span>
              <span className={`rounded-full px-2 py-1 text-xs font-black ${color}`}>{alerta.badge}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function chaveDataMovimento(data: Date) {
  return data.toISOString().slice(0, 10);
}

function rotuloDataExtrato(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(data)
    .toLocaleUpperCase("pt-BR");
}

function agruparMovimentosPorDia(movimentos: MovimentoBancoHoras[]) {
  const grupos = new Map<
    string,
    { data: Date; movimentos: MovimentoBancoHoras[]; saldoDia: number }
  >();

  for (const movimento of movimentos) {
    const chave = chaveDataMovimento(movimento.dataReferencia);
    const grupo =
      grupos.get(chave) ??
      { data: movimento.dataReferencia, movimentos: [], saldoDia: 0 };

    grupo.movimentos.push(movimento);
    grupo.saldoDia += movimento.minutos;
    grupos.set(chave, grupo);
  }

  return Array.from(grupos.values())
    .map((grupo) => ({
      ...grupo,
      movimentos: grupo.movimentos.sort(
        (a, b) => b.dataReferencia.getTime() - a.dataReferencia.getTime(),
      ),
    }))
    .sort((a, b) => b.data.getTime() - a.data.getTime());
}

function MovimentoExtratoItem({ movimento }: { movimento: MovimentoBancoHoras }) {
  const credito = ehCredito(movimento.tipo);
  const debito = ehDebito(movimento.tipo);
  const Icon = credito ? ArrowUp : debito ? ArrowDown : RefreshCw;
  const valorMovimento = credito
    ? movimento.minutos
    : debito
      ? -Math.abs(movimento.minutos)
      : movimento.minutos;
  const corIcone = credito
    ? "bg-emerald-50 text-emerald-700"
    : debito
      ? "bg-rose-50 text-rose-700"
      : "bg-blue-50 text-blue-700";
  const corValor = valorMovimento >= 0 ? "text-emerald-700" : "text-rose-600";

  return (
    <article className="relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-3 py-3 pl-1 pr-2">
      <span className="absolute bottom-0 left-[1.35rem] top-0 w-px bg-slate-200" aria-hidden="true" />
      <span className={`relative z-10 mt-1 grid size-9 place-items-center rounded-xl ${corIcone}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black leading-5 text-slate-950">
            {rotuloTipoMovimentoBancoHoras(movimento.tipo)}
          </h3>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${classeStatus(movimento.status)}`}>
            {rotuloStatusMovimentoBancoHoras(movimento.status)}
          </span>
        </div>
        <p className="mt-0.5 text-xs font-bold text-slate-500">
          {formatarDataCivilBancoHoras(movimento.dataReferencia)} -{" "}
          {rotuloOrigemMovimentoBancoHoras(movimento.origem)}
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-600">
          {movimento.descricao ?? "Lançamento sem observação informada."}
        </p>
      </div>
      <div className="flex items-center gap-2 self-start pt-1">
        <span className={`whitespace-nowrap text-sm font-black ${corValor}`}>
          {valorMovimento > 0 ? "+" : ""}
          {minutosParaHoraBanco(valorMovimento)}
        </span>
        <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
      </div>
    </article>
  );
}

function MovimentosTable({ movimentos }: { movimentos: MovimentoBancoHoras[] }) {
  const grupos = agruparMovimentosPorDia(movimentos);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-blue-950">
          <FileText className="size-5 text-blue-700" aria-hidden="true" />
          Lançamentos do banco
        </h2>
        <span className="rounded-lg border px-3 py-1 text-xs font-bold text-slate-500">
          {movimentos.length} registro{movimentos.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-5 bg-slate-50/60 p-4">
        {grupos.map((grupo) => {
          const saldoPositivo = grupo.saldoDia >= 0;

          return (
            <section key={chaveDataMovimento(grupo.data)} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Calendar className="size-4 text-blue-700" aria-hidden="true" />
                <span>{rotuloDataExtrato(grupo.data)}</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                      <Clock3 className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-black text-slate-950">Saldo do dia</h3>
                      <p className="text-sm font-semibold text-slate-500">
                        Banco de horas
                      </p>
                    </div>
                  </div>
                  <span
                    className={`whitespace-nowrap pt-1 text-base font-black ${
                      saldoPositivo ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {saldoPositivo ? "+" : ""}
                    {minutosParaHoraBanco(grupo.saldoDia)}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 px-3">
                  {grupo.movimentos.map((movimento) => (
                    <MovimentoExtratoItem
                      key={movimento.id}
                      movimento={movimento}
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {movimentos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm font-medium text-slate-500">
            Nenhum lançamento encontrado para a competência selecionada.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function BancoHorasPageReal({
  servidores,
  servidorSelecionado,
  movimentos,
  movimentosComposicaoSaldo,
  autorizacoes,
  anoReferencia,
  mesReferencia,
  podeSelecionarServidor,
  podeGerenciar,
  perfilAtivoCodigo,
}: BancoHorasPageRealProps) {
  const saldo = saldoPadrao(servidorSelecionado?.bancoHorasSaldo ?? null);
  const creditosPeriodo = somar(movimentos, (movimento) => ehCredito(movimento.tipo));
  const debitosPeriodo = Math.abs(somar(movimentos, (movimento) => ehDebito(movimento.tipo)));
  const compensacoes = Math.abs(
    somar(movimentos, (movimento) => movimento.tipo.startsWith("COMPENSACAO")),
  );
  const horasAVencer = somar(movimentos, (movimento) =>
    Boolean(movimento.expiraEm) && ehCredito(movimento.tipo),
  );
  const pendentes =
    movimentos.filter((movimento) => movimento.status === "PENDENTE").length +
    autorizacoes.filter((autorizacao) => autorizacao.status === "AUTORIZADA").length;
  const anterior = moverMes(anoReferencia, mesReferencia, -1);
  const proximo = moverMes(anoReferencia, mesReferencia, 1);
  const perfilServidorAtivo = perfilAtivoCodigo?.toUpperCase() === "SERVIDOR";

  return (
    <main className="-mt-4 space-y-1.5 text-slate-700">
      <div className="flex min-h-9 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb
          items={[
            { label: "Ponto" },
            { label: "Banco de horas" },
            { label: perfilServidorAtivo ? "Meu banco de horas" : "Banco de horas" },
          ]}
        />
        <div className="flex flex-wrap items-end gap-2 sm:justify-end">
          <Link
            href={hrefCompetencia({ ...anterior, servidorId: servidorSelecionado?.id })}
            className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            aria-label="Competência anterior"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Link>
          <BancoHorasCompetenciaAutoForm
            competencia={competenciaInput(anoReferencia, mesReferencia)}
            servidorId={servidorSelecionado?.id}
          />
          <Link
            href={hrefCompetencia({ ...proximo, servidorId: servidorSelecionado?.id })}
            className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            aria-label="Próxima competência"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <BancoHorasHeader
        titulo={perfilServidorAtivo ? "Meu banco de horas" : "Banco de horas"}
        descricao="Acompanhe seu saldo, créditos, débitos, compensações e prazos regulamentares."
      />

      {!servidorSelecionado ? (
        <section className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">
          Nenhum servidor disponível para consulta de banco de horas.
        </section>
      ) : (
        <>
          {podeSelecionarServidor ? (
            <BancoHorasFiltrosAuto
              competencia={competenciaInput(anoReferencia, mesReferencia)}
              servidorId={servidorSelecionado.id}
              servidores={servidores.map((servidor) => ({
                value: servidor.id,
                label: `${servidor.matricula} - ${nomeServidor(servidor)}`,
                searchText: `${servidor.matricula} ${nomeServidor(servidor)}`,
              }))}
              podeSelecionarServidor={podeSelecionarServidor}
            />
          ) : null}

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <KPI icon={Clock3} titulo="Saldo atual" valor={minutosParaHoraBanco(saldo.saldoMinutos)} detalhe="em relação ao mês anterior" sub={saldo.saldoMinutos >= 0 ? "Saldo positivo" : "Compensação necessária"} tone="green" />
            <KPI icon={ArrowUp} titulo="Créditos no período" valor={minutosParaHoraBanco(creditosPeriodo)} detalhe={`+ ${movimentos.filter((m) => ehCredito(m.tipo)).length} lançamentos`} tone="green" />
            <KPI icon={ArrowDown} titulo="Débitos no período" valor={minutosParaHoraBanco(debitosPeriodo)} detalhe={`- ${movimentos.filter((m) => ehDebito(m.tipo)).length} lançamentos`} tone="red" />
            <KPI icon={RefreshCw} titulo="Compensações" valor={minutosParaHoraBanco(compensacoes)} detalhe={`${autorizacoes.length} autorizações no período`} tone="purple" />
            <KPI icon={Clock3} titulo="Horas a vencer" valor={minutosParaHoraBanco(horasAVencer)} detalhe="em prazo regulamentar" tone="orange" />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)_17rem]">
            <EvolucaoCard movimentos={movimentosComposicaoSaldo} anoReferencia={anoReferencia} mesReferencia={mesReferencia} />
            <ComposicaoCard saldo={saldo} />
            <AcoesRapidas servidorId={servidorSelecionado.id} anoReferencia={anoReferencia} mesReferencia={mesReferencia} podeGerenciar={podeGerenciar} />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <PrazoCard movimentos={movimentosComposicaoSaldo} />
            <AlertasCard creditosAVencer={horasAVencer} pendentes={pendentes} saldoMinutos={saldo.saldoMinutos} />
          </section>

          <MovimentosTable movimentos={movimentos} />
        </>
      )}
    </main>
  );
}
