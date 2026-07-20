import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Hourglass,
  Landmark,
  PlusCircle,
  RotateCw,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { CompetenciaInput, SearchableSelect } from "@/components/ui";
import { RelatorioExportacaoButton } from "@/modules/relatorios/presentation/components/relatorio-exportacao-button";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { gerarMovimentosBancoHorasAction } from "../../application/actions/gerar-movimento-banco-horas.action";
import { expirarDebitosVencidosAction } from "../../application/actions/expirar-debitos-vencidos.action";
import { incluirAjusteManualBancoHorasAction } from "../../application/actions/incluir-ajuste-manual-banco-horas.action";
import { recalcularSaldoBancoHorasAction } from "../../application/actions/recalcular-saldo-banco-horas.action";
import { LIMITE_CREDITO_MENSAL_MINUTOS } from "../../application/services/aplicar-limites-banco-horas.service";
import {
  formatarDataCivilBancoHoras,
  minutosParaHoraBanco,
  rotuloOrigemMovimentoBancoHoras,
} from "../../application/services/formatar-banco-horas.service";
import { MovimentosBancoHorasTable } from "./movimentos-banco-horas-table";

type ServidorBancoHoras = {
  id: string;
  matricula: string;
  nomeFuncional?: string | null;
  usuario: {
    nome: string;
  };
  bancoHorasSaldo: {
    saldoMinutos: number;
    creditosValidadosMinutos: number;
    debitosValidadosMinutos: number;
    creditosPendentesMinutos: number;
    debitosPendentesMinutos: number;
    horasAcimaLimiteMinutos: number;
    horasNaoAutorizadasMinutos: number;
  } | null;
  lotacoes?: Array<{
    unidade: {
      sigla: string;
      nome: string;
    };
  }>;
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
  autorizadoPor: {
    nome: string;
  };
  solicitacao: {
    id: string;
    titulo: string;
  };
  movimentos: Array<{
    minutos: number;
  }>;
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

type ExtratoSaldoTipo =
  | "creditos-validados"
  | "debitos-validados"
  | "creditos-pendentes"
  | "debitos-pendentes";

const extratosSaldo: Record<
  ExtratoSaldoTipo,
  {
    titulo: string;
    descricao: string;
    tipo: "CREDITO" | "DEBITO";
    status: "VALIDADO" | "PENDENTE";
  }
> = {
  "creditos-validados": {
    titulo: "Créditos validados",
    descricao: "Horas positivas já confirmadas e incorporadas ao saldo consolidado.",
    tipo: "CREDITO",
    status: "VALIDADO",
  },
  "debitos-validados": {
    titulo: "Débitos validados",
    descricao: "Horas negativas já confirmadas no saldo consolidado.",
    tipo: "DEBITO",
    status: "VALIDADO",
  },
  "creditos-pendentes": {
    titulo: "Créditos pendentes",
    descricao: "Horas positivas aguardando conferência ou validação no saldo consolidado.",
    tipo: "CREDITO",
    status: "PENDENTE",
  },
  "debitos-pendentes": {
    titulo: "Débitos pendentes",
    descricao: "Horas negativas aguardando conferência ou validação no saldo consolidado.",
    tipo: "DEBITO",
    status: "PENDENTE",
  },
};

function inicioDoDia(data: Date) {
  const clone = new Date(data);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function somarMovimentos(
  movimentos: MovimentoBancoHoras[],
  filtro: (movimento: MovimentoBancoHoras) => boolean,
) {
  return movimentos
    .filter(filtro)
    .reduce((total, movimento) => total + movimento.minutos, 0);
}

function totalCreditosMes(movimentos: MovimentoBancoHoras[]) {
  return somarMovimentos(
    movimentos,
    (movimento) =>
      movimento.tipo === "CREDITO" &&
      ["PENDENTE", "VALIDADO"].includes(movimento.status),
  );
}

function totalCreditosAVencer(movimentos: MovimentoBancoHoras[]) {
  const hoje = inicioDoDia(new Date());

  return somarMovimentos(
    movimentos,
    (movimento) =>
      movimento.tipo === "CREDITO" &&
      ["PENDENTE", "VALIDADO"].includes(movimento.status) &&
      Boolean(movimento.expiraEm) &&
      inicioDoDia(movimento.expiraEm as Date) >= hoje,
  );
}

function totalDebitosACompensar(movimentos: MovimentoBancoHoras[]) {
  return somarMovimentos(
    movimentos,
    (movimento) =>
      movimento.tipo === "DEBITO" &&
      ["PENDENTE", "VALIDADO"].includes(movimento.status),
  );
}

function totalMovimentosVencidos(movimentos: MovimentoBancoHoras[]) {
  const hoje = inicioDoDia(new Date());

  return somarMovimentos(
    movimentos,
    (movimento) =>
      ["CREDITO", "DEBITO"].includes(movimento.tipo) &&
      ["PENDENTE", "VALIDADO"].includes(movimento.status) &&
      Boolean(movimento.expiraEm) &&
      inicioDoDia(movimento.expiraEm as Date) < hoje,
  );
}

function totalDebitosVencidosParaDesconto(movimentos: MovimentoBancoHoras[]) {
  const hoje = inicioDoDia(new Date());

  return somarMovimentos(
    movimentos,
    (movimento) =>
      movimento.tipo === "DEBITO" &&
      movimento.status === "VALIDADO" &&
      Boolean(movimento.expiraEm) &&
      inicioDoDia(movimento.expiraEm as Date) < hoje,
  );
}

function menorDataLimite(
  movimentos: MovimentoBancoHoras[],
  filtro: (movimento: MovimentoBancoHoras) => boolean,
) {
  const datas = movimentos
    .filter(
      (movimento) =>
        filtro(movimento) &&
        ["PENDENTE", "VALIDADO"].includes(movimento.status) &&
        Boolean(movimento.expiraEm),
    )
    .map((movimento) => inicioDoDia(movimento.expiraEm as Date))
    .sort((a, b) => a.getTime() - b.getTime());

  return datas[0] ?? null;
}

function formatarDataLimite(data: Date | null) {
  return data ? formatarDataCivilBancoHoras(data) : null;
}

function referenciaAtual() {
  const data = new Date();

  return {
    ano: data.getFullYear(),
    mes: data.getMonth() + 1,
  };
}

function competenciaParaInput(anoReferencia: number, mesReferencia: number) {
  return `${anoReferencia}-${String(mesReferencia).padStart(2, "0")}`;
}

function normalizarExtratoSaldo(
  extrato?: string,
): ExtratoSaldoTipo | null {
  return extrato && extrato in extratosSaldo
    ? (extrato as ExtratoSaldoTipo)
    : null;
}

function hrefExtratoSaldo({
  servidorId,
  anoReferencia,
  mesReferencia,
  extrato,
  competenciaDetalhada,
  ancora = "extrato-saldo",
}: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  extrato: ExtratoSaldoTipo;
  competenciaDetalhada?: string;
  ancora?: "extrato-saldo" | "extrato-diario";
}) {
  const params = new URLSearchParams({
    servidorId,
    competencia: competenciaParaInput(anoReferencia, mesReferencia),
    extrato,
  });

  if (competenciaDetalhada) {
    params.set("detalhar", competenciaDetalhada);
  }

  return `/banco-horas?${params.toString()}#${ancora}`;
}

function chaveCompetencia(anoReferencia: number, mesReferencia: number) {
  return `${anoReferencia}-${String(mesReferencia).padStart(2, "0")}`;
}

function rotuloCompetencia(anoReferencia: number, mesReferencia: number) {
  return `${String(mesReferencia).padStart(2, "0")}/${anoReferencia}`;
}

function dadosSaldoPadrao(saldo: ServidorBancoHoras["bancoHorasSaldo"]) {
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

function FiltrosBancoHoras({
  servidores,
  servidorSelecionado,
  anoReferencia,
  mesReferencia,
  podeSelecionarServidor,
  compacto = false,
}: {
  servidores: ServidorBancoHoras[];
  servidorSelecionado: ServidorBancoHoras | null;
  anoReferencia: number;
  mesReferencia: number;
  podeSelecionarServidor: boolean;
  compacto?: boolean;
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-bold text-[var(--foreground)]">
          {compacto ? "Consultar outro mês" : "Consulta"}
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {compacto
            ? "Altere a competência sem sair do seu saldo."
            : "Selecione o servidor e a competência antes de analisar o saldo."}
        </p>
      </div>

      <form
        className={
          compacto
            ? "space-y-4"
            : "grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end"
        }
      >
        <div
          className={compacto && !podeSelecionarServidor ? "hidden" : undefined}
        >
          <label htmlFor="servidorId" className="text-sm font-semibold">
            Servidor
          </label>
          <SearchableSelect
            id="servidorId"
            name="servidorId"
            defaultValue={servidorSelecionado?.id ?? ""}
            disabled={!podeSelecionarServidor}
            className="mt-2"
            searchPlaceholder="Pesquisar por matrícula ou nome..."
            options={servidores.map((servidor) => ({
              value: servidor.id,
              label: `${servidor.matricula} - ${nomeServidor(servidor)}`,
            }))}
          />
        </div>

        <CompetenciaInput
          defaultValue={competenciaParaInput(anoReferencia, mesReferencia)}
        />

        <button
          type="submit"
          className="secp-theme-action h-10 rounded-md border px-4 text-sm font-semibold transition"
        >
          Aplicar
        </button>
      </form>
    </section>
  );
}

function SaldoPrincipalCard({
  servidor,
  saldoMinutos,
  creditosValidadosMinutos,
  debitosValidadosMinutos,
  creditosPendentesMinutos,
  debitosPendentesMinutos,
  anoReferencia,
  mesReferencia,
  perfilServidorAtivo,
  extratoAtivo,
}: {
  servidor: ServidorBancoHoras;
  saldoMinutos: number;
  creditosValidadosMinutos: number;
  debitosValidadosMinutos: number;
  creditosPendentesMinutos: number;
  debitosPendentesMinutos: number;
  anoReferencia: number;
  mesReferencia: number;
  perfilServidorAtivo: boolean;
  extratoAtivo: ExtratoSaldoTipo | null;
}) {
  const saldoPositivo = saldoMinutos >= 0;

  return (
    <section className="secp-banco-horas-balance-card overflow-hidden rounded-xl border shadow-sm">
      <div className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="secp-banco-horas-balance-muted text-sm font-semibold">
              {perfilServidorAtivo ? "Meu saldo disponível" : "Saldo do servidor"}
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              {minutosParaHoraBanco(saldoMinutos)}
            </h2>
            <p className="secp-banco-horas-balance-muted mt-2 text-sm">
              {saldoPositivo
                ? "Horas disponíveis para fruição ou compensação."
                : "Saldo negativo que exige compensação no prazo."}
            </p>
          </div>

          <RelatorioExportacaoButton
            href={`/api/relatorios/banco-horas/${servidor.id}/pdf?ano=${anoReferencia}&mes=${mesReferencia}`}
            className="secp-theme-primary-action inline-flex w-fit items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition"
          >
            Exportar PDF
          </RelatorioExportacaoButton>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SaldoMiniIndicador
            titulo="Créditos validados"
            valor={minutosParaHoraBanco(creditosValidadosMinutos)}
            href={hrefExtratoSaldo({
              servidorId: servidor.id,
              anoReferencia,
              mesReferencia,
              extrato: "creditos-validados",
            })}
            ativo={extratoAtivo === "creditos-validados"}
          />
          <SaldoMiniIndicador
            titulo="Débitos validados"
            valor={minutosParaHoraBanco(debitosValidadosMinutos)}
            href={hrefExtratoSaldo({
              servidorId: servidor.id,
              anoReferencia,
              mesReferencia,
              extrato: "debitos-validados",
            })}
            ativo={extratoAtivo === "debitos-validados"}
          />
          <SaldoMiniIndicador
            titulo="Créditos pendentes"
            valor={minutosParaHoraBanco(creditosPendentesMinutos)}
            href={hrefExtratoSaldo({
              servidorId: servidor.id,
              anoReferencia,
              mesReferencia,
              extrato: "creditos-pendentes",
            })}
            ativo={extratoAtivo === "creditos-pendentes"}
          />
          <SaldoMiniIndicador
            titulo="Débitos pendentes"
            valor={minutosParaHoraBanco(debitosPendentesMinutos)}
            href={hrefExtratoSaldo({
              servidorId: servidor.id,
              anoReferencia,
              mesReferencia,
              extrato: "debitos-pendentes",
            })}
            ativo={extratoAtivo === "debitos-pendentes"}
          />
        </div>
      </div>

      <div className="border-t border-white/10 bg-white/5 px-6 py-4">
        <p className="text-sm font-semibold">{nomeServidor(servidor)}</p>
        <p className="secp-banco-horas-balance-muted mt-1 text-sm">
          Matrícula {servidor.matricula} -{" "}
          {servidor.lotacoes?.[0]?.unidade.sigla ??
            "Sem lotação na competência"}
        </p>
      </div>
    </section>
  );
}

function SaldoMiniIndicador({
  titulo,
  valor,
  href,
  ativo,
}: {
  titulo: string;
  valor: string;
  href: string;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "true" : undefined}
      className="secp-banco-horas-mini-card rounded-lg border p-3 transition"
    >
      <p className="secp-banco-horas-balance-muted text-xs font-medium">{titulo}</p>
      <p className="mt-1 font-mono text-lg font-bold">{valor}</p>
      <p className="secp-banco-horas-balance-muted mt-2 text-xs font-semibold">
        Ver composição
      </p>
    </Link>
  );
}

function AtalhosBancoHoras({
  perfilServidorAtivo,
  podeSelecionarServidor,
}: {
  perfilServidorAtivo: boolean;
  podeSelecionarServidor: boolean;
}) {
  return (
    <div className="mt-4 grid gap-2">
      {perfilServidorAtivo ? (
        <Link
          href="/banco-horas/solicitacoes"
          className="secp-theme-primary-action inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition"
        >
          Solicitar uso ou geração
        </Link>
      ) : null}
      <Link
        href="/banco-horas/vencimentos"
        className="secp-theme-action inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition"
      >
        Ver vencimentos
      </Link>
      {podeSelecionarServidor ? (
        <Link
          href="/banco-horas/chefia"
          className="secp-theme-action inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition"
        >
          Painel da chefia
        </Link>
      ) : null}
      <Link
        href="/banco-horas/relatorios"
        className="secp-theme-action inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition"
      >
        Relatórios
      </Link>
    </div>
  );
}

function AcoesBancoHoras({
  servidorId,
  anoReferencia,
  mesReferencia,
  podeGerenciar,
  perfilServidorAtivo,
  podeSelecionarServidor,
}: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  podeGerenciar: boolean;
  perfilServidorAtivo: boolean;
  podeSelecionarServidor: boolean;
}) {
  if (!podeGerenciar) {
    return (
      <section className="rounded-xl border bg-[var(--card)] p-5 text-sm text-[var(--muted-foreground)] shadow-sm">
        <h2 className="text-base font-bold text-[var(--foreground)]">
          Próximos passos
        </h2>
        <p className="mt-2 leading-6">
          Consulte os movimentos abaixo para entender a composição do saldo. Em
          caso de divergência, registre uma solicitação para análise da chefia.
        </p>
        <AtalhosBancoHoras
          perfilServidorAtivo={perfilServidorAtivo}
          podeSelecionarServidor={podeSelecionarServidor}
        />
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <h2 className="text-base font-bold text-[var(--foreground)]">
        Ações administrativas
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
        Rotinas de manutenção do saldo e tratamento de débitos vencidos.
      </p>

      <div className="mt-4 space-y-2">
        <form action={gerarMovimentosBancoHorasAction}>
          <input type="hidden" name="servidorId" value={servidorId} />
          <input type="hidden" name="anoReferencia" value={anoReferencia} />
          <input type="hidden" name="mesReferencia" value={mesReferencia} />
          <button
            type="submit"
            className="secp-theme-action inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition"
          >
            <RotateCw className="size-4" aria-hidden="true" />
            Gerar movimentos
          </button>
        </form>

        <form action={recalcularSaldoBancoHorasAction}>
          <input type="hidden" name="servidorId" value={servidorId} />
          <button
            type="submit"
            className="secp-theme-action inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition"
          >
            <RotateCw className="size-4" aria-hidden="true" />
            Recalcular saldo
          </button>
        </form>

        <form action={expirarDebitosVencidosAction}>
          <input type="hidden" name="servidorId" value={servidorId} />
          <button
            type="submit"
            className="secp-theme-action inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition"
          >
            <Landmark className="size-4" aria-hidden="true" />
            Expirar débitos vencidos
          </button>
        </form>
      </div>
    </section>
  );
}

function ResumoOperacionalBancoHoras({
  saldoMinutos,
  creditosMes,
  limiteRestante,
  creditosAVencer,
  debitosACompensar,
  horasNaoAutorizadasMinutos,
  horasAcimaLimiteMinutos,
  limiteCredito,
  limiteDebito,
}: {
  saldoMinutos: number;
  creditosMes: number;
  limiteRestante: number;
  creditosAVencer: number;
  debitosACompensar: number;
  horasNaoAutorizadasMinutos: number;
  horasAcimaLimiteMinutos: number;
  limiteCredito: string | null;
  limiteDebito: string | null;
}) {
  const saldoNegativo = saldoMinutos < 0;
  const pendenciasMinutos = horasNaoAutorizadasMinutos + horasAcimaLimiteMinutos;
  const percentualLimite = Math.min(
    100,
    Math.round((creditosMes / LIMITE_CREDITO_MENSAL_MINUTOS) * 100),
  );

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
      <div className="rounded-lg border bg-[var(--card)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-bold">Visão rápida</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              O saldo é calculado a partir dos lançamentos autorizados,
              homologados ou pendentes de validação, sem edição direta.
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              saldoNegativo
                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            }`}
          >
            {saldoNegativo ? "Requer compensação" : "Saldo regular"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <IndicadorOperacional
            icon={TrendingUp}
            titulo="Limite mensal"
            valor={`${percentualLimite}%`}
            detalhe={`${minutosParaHoraBanco(limiteRestante)} ainda disponível`}
          />
          <IndicadorOperacional
            icon={CalendarClock}
            titulo="Créditos a vencer"
            valor={minutosParaHoraBanco(creditosAVencer)}
            detalhe={limiteCredito ? `Próximo prazo: ${limiteCredito}` : "Sem prazo próximo"}
          />
          <IndicadorOperacional
            icon={TrendingDown}
            titulo="Débitos a compensar"
            valor={minutosParaHoraBanco(debitosACompensar)}
            detalhe={limiteDebito ? `Próximo prazo: ${limiteDebito}` : "Sem prazo próximo"}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-[var(--card)] p-4 shadow-sm">
        <h2 className="text-base font-bold">Pendências normativas</h2>
        <div className="mt-4 space-y-3 text-sm">
          <LinhaPendencia
            label="Horas não autorizadas"
            valor={minutosParaHoraBanco(horasNaoAutorizadasMinutos)}
            ativo={horasNaoAutorizadasMinutos > 0}
          />
          <LinhaPendencia
            label="Horas acima do limite"
            valor={minutosParaHoraBanco(horasAcimaLimiteMinutos)}
            ativo={horasAcimaLimiteMinutos > 0}
          />
          <LinhaPendencia
            label="Total a revisar"
            valor={minutosParaHoraBanco(pendenciasMinutos)}
            ativo={pendenciasMinutos > 0}
          />
        </div>
      </div>
    </section>
  );
}

function IndicadorOperacional({
  icon: Icon,
  titulo,
  valor,
  detalhe,
}: {
  icon: LucideIcon;
  titulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        <Icon className="size-4" aria-hidden="true" />
        {titulo}
      </div>
      <p className="mt-2 font-mono text-xl font-bold">{valor}</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{detalhe}</p>
    </div>
  );
}

function LinhaPendencia({
  label,
  valor,
  ativo,
}: {
  label: string;
  valor: string;
  ativo: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span
        className={`font-mono font-bold ${
          ativo ? "text-amber-700 dark:text-amber-300" : "text-[var(--foreground)]"
        }`}
      >
        {valor}
      </span>
    </div>
  );
}

function ExtratoComposicaoSaldo({
  extrato,
  movimentos,
  servidorId,
  anoReferencia,
  mesReferencia,
  competenciaDetalhada,
}: {
  extrato: ExtratoSaldoTipo;
  movimentos: MovimentoBancoHoras[];
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  competenciaDetalhada?: string;
}) {
  const configuracao = extratosSaldo[extrato];
  const movimentosFiltrados = movimentos.filter(
    (movimento) =>
      movimento.tipo === configuracao.tipo &&
      movimento.status === configuracao.status,
  );
  const total = movimentosFiltrados.reduce(
    (soma, movimento) => soma + movimento.minutos,
    0,
  );
  const competencias = Array.from(
    movimentosFiltrados
      .reduce((mapa, movimento) => {
        const chave = chaveCompetencia(
          movimento.anoReferencia,
          movimento.mesReferencia,
        );
        const atual = mapa.get(chave) ?? {
          chave,
          anoReferencia: movimento.anoReferencia,
          mesReferencia: movimento.mesReferencia,
          total: 0,
          quantidade: 0,
        };

        atual.total += movimento.minutos;
        atual.quantidade += 1;
        mapa.set(chave, atual);

        return mapa;
      }, new Map<string, { chave: string; anoReferencia: number; mesReferencia: number; total: number; quantidade: number }>())
      .values(),
  ).sort((a, b) =>
    a.anoReferencia === b.anoReferencia
      ? a.mesReferencia - b.mesReferencia
      : a.anoReferencia - b.anoReferencia,
  );
  const detalheAtivo = competencias.some(
    (competencia) => competencia.chave === competenciaDetalhada,
  )
    ? competenciaDetalhada
    : null;
  const movimentosDetalhados = detalheAtivo
    ? movimentosFiltrados.filter(
        (movimento) =>
          chaveCompetencia(
            movimento.anoReferencia,
            movimento.mesReferencia,
          ) === detalheAtivo,
      )
    : [];

  return (
    <section
      id="extrato-saldo"
      className="scroll-mt-24 rounded-xl border bg-[var(--card)] shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--secp-theme-accent)]">
            Extrato da composição
          </p>
          <h2 className="mt-1 text-xl font-bold">{configuracao.titulo}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {configuracao.descricao}
          </p>
        </div>

        <div className="rounded-lg bg-[var(--muted)] px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
            Total
          </p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {minutosParaHoraBanco(total)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Competência</th>
              <th className="px-5 py-3">Lançamentos</th>
              <th className="px-5 py-3 text-right">Horas</th>
              <th className="px-5 py-3 text-right">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {competencias.map((competencia) => (
              <tr key={competencia.chave} className="border-b last:border-0">
                <td className="px-5 py-4 font-mono">
                  {rotuloCompetencia(
                    competencia.anoReferencia,
                    competencia.mesReferencia,
                  )}
                </td>
                <td className="px-5 py-4 text-[var(--muted-foreground)]">
                  {competencia.quantidade} lançamento
                  {competencia.quantidade === 1 ? "" : "s"}
                </td>
                <td className="px-5 py-4 text-right font-mono font-bold">
                  {minutosParaHoraBanco(competencia.total)}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={
                      detalheAtivo === competencia.chave
                        ? hrefExtratoSaldo({
                            servidorId,
                            anoReferencia,
                            mesReferencia,
                            extrato,
                          })
                        : hrefExtratoSaldo({
                            servidorId,
                            anoReferencia,
                            mesReferencia,
                            extrato,
                            competenciaDetalhada: competencia.chave,
                            ancora: "extrato-diario",
                          })
                    }
                    className="text-sm font-semibold text-[var(--secp-theme-accent)] underline-offset-4 hover:underline"
                  >
                    {detalheAtivo === competencia.chave
                      ? "Detalhando"
                      : "Detalhar"}
                  </Link>
                </td>
              </tr>
            ))}

            {competencias.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum movimento encontrado para esta composição na
                  composição do saldo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detalheAtivo ? (
        <div id="extrato-diario" className="scroll-mt-24 border-t p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-base font-bold">
                Composição diária de{" "}
                {rotuloCompetencia(
                  Number(detalheAtivo.slice(0, 4)),
                  Number(detalheAtivo.slice(5, 7)),
                )}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Lançamentos que compõem o total consolidado da competência.
              </p>
            </div>

            <Link
              href={hrefExtratoSaldo({
                servidorId,
                anoReferencia,
                mesReferencia,
                extrato,
              })}
              className="secp-theme-action inline-flex w-fit items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition"
            >
              Voltar para competências
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Origem</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3">Vencimento</th>
                  <th className="px-5 py-3 text-right">Horas</th>
                </tr>
              </thead>
              <tbody>
                {movimentosDetalhados.map((movimento) => (
                  <tr key={movimento.id} className="border-b last:border-0">
                    <td className="px-5 py-4">
                      {formatarDataCivilBancoHoras(movimento.dataReferencia)}
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {rotuloOrigemMovimentoBancoHoras(movimento.origem)}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">
                      {movimento.descricao ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      {movimento.expiraEm
                        ? formatarDataCivilBancoHoras(movimento.expiraEm)
                        : "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold">
                      {minutosParaHoraBanco(movimento.minutos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
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
  extratoSelecionado,
  competenciaDetalhada,
}: BancoHorasPageRealProps) {
  const creditosMes = totalCreditosMes(movimentos);
  const limiteRestante = Math.max(0, LIMITE_CREDITO_MENSAL_MINUTOS - creditosMes);
  const creditosAVencer = totalCreditosAVencer(movimentos);
  const debitosACompensar = totalDebitosACompensar(movimentos);
  const debitosVencidosParaDesconto =
    totalDebitosVencidosParaDesconto(movimentos);
  const movimentosVencidos = totalMovimentosVencidos(movimentos);
  const limiteCredito = formatarDataLimite(
    menorDataLimite(movimentos, (movimento) => movimento.tipo === "CREDITO"),
  );
  const limiteDebito = formatarDataLimite(
    menorDataLimite(movimentos, (movimento) => movimento.tipo === "DEBITO"),
  );
  const { ano, mes } = referenciaAtual();
  const perfilServidorAtivo = perfilAtivoCodigo?.toUpperCase() === "SERVIDOR";
  const perfilChefiaAtivo = perfilAtivoCodigo?.toUpperCase() === "CHEFIA";
  const tituloPagina = perfilServidorAtivo
    ? "Meu banco de horas"
    : perfilChefiaAtivo
      ? "Banco de horas da equipe"
      : "Banco de horas";
  const descricaoPagina = perfilServidorAtivo
    ? "Acompanhe seu saldo, créditos, débitos, compensações e prazos regulamentares."
    : perfilChefiaAtivo
      ? "Acompanhe o próprio saldo e o banco de horas dos servidores da sua equipe."
      : "Acompanhe saldo individual, créditos, débitos, compensações, limites mensais e prazos regulamentares.";
  const dadosSaldo = dadosSaldoPadrao(servidorSelecionado?.bancoHorasSaldo ?? null);
  const extratoAtivo = normalizarExtratoSaldo(extratoSelecionado);

  return (
    <div className="secp-banco-horas space-y-6">
      <Breadcrumb items={[{ label: "Banco de horas" }]} />

      <PageHeader
        icon={Hourglass}
        titulo={tituloPagina}
        descricao={descricaoPagina}
        artigo="Banco de horas"
        regraTitulo="Limite e compensação"
        regraDescricao="Créditos e compensações dependem de autorização prévia da chefia. O limite ordinário de crédito para fruição futura é de 16h mensais."
      />

      <section
        className={
          perfilServidorAtivo
            ? "hidden"
            : "rounded-xl border bg-[var(--card)] p-5 shadow-sm"
        }
      >
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div>
            <label htmlFor="servidorId" className="text-sm font-semibold">
              Servidor
            </label>
            <SearchableSelect
              id="servidorId"
              name="servidorId"
              defaultValue={servidorSelecionado?.id ?? ""}
              disabled={!podeSelecionarServidor}
              className="mt-2"
              searchPlaceholder="Pesquisar por matrícula ou nome..."
              options={servidores.map((servidor) => ({
                value: servidor.id,
                label: `${servidor.matricula} — ${nomeServidor(servidor)}`,
              }))}
            />
          </div>

          <CompetenciaInput
            defaultValue={competenciaParaInput(anoReferencia, mesReferencia)}
          />

          <button
            type="submit"
            className="secp-theme-action h-10 rounded-md border px-4 text-sm font-semibold transition"
          >
            Aplicar
          </button>
        </form>
      </section>

      {servidorSelecionado ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <SaldoPrincipalCard
              servidor={servidorSelecionado}
              saldoMinutos={dadosSaldo.saldoMinutos}
              creditosValidadosMinutos={dadosSaldo.creditosValidadosMinutos}
              debitosValidadosMinutos={dadosSaldo.debitosValidadosMinutos}
              creditosPendentesMinutos={dadosSaldo.creditosPendentesMinutos}
              debitosPendentesMinutos={dadosSaldo.debitosPendentesMinutos}
              anoReferencia={anoReferencia}
              mesReferencia={mesReferencia}
              perfilServidorAtivo={perfilServidorAtivo}
              extratoAtivo={extratoAtivo}
            />

            <div className="space-y-4">
              {perfilServidorAtivo ? (
                <FiltrosBancoHoras
                  servidores={servidores}
                  servidorSelecionado={servidorSelecionado}
                  anoReferencia={anoReferencia}
                  mesReferencia={mesReferencia}
                  podeSelecionarServidor={podeSelecionarServidor}
                  compacto
                />
              ) : null}

              <AcoesBancoHoras
                servidorId={servidorSelecionado.id}
                anoReferencia={anoReferencia || ano}
                mesReferencia={mesReferencia || mes}
                podeGerenciar={podeGerenciar}
                perfilServidorAtivo={perfilServidorAtivo}
                podeSelecionarServidor={podeSelecionarServidor}
              />
            </div>
          </section>

          <ResumoOperacionalBancoHoras
            saldoMinutos={dadosSaldo.saldoMinutos}
            creditosMes={creditosMes}
            limiteRestante={limiteRestante}
            creditosAVencer={creditosAVencer}
            debitosACompensar={debitosACompensar}
            horasNaoAutorizadasMinutos={dadosSaldo.horasNaoAutorizadasMinutos}
            horasAcimaLimiteMinutos={dadosSaldo.horasAcimaLimiteMinutos}
            limiteCredito={limiteCredito}
            limiteDebito={limiteDebito}
          />

          {extratoAtivo ? (
            <ExtratoComposicaoSaldo
              extrato={extratoAtivo}
              movimentos={movimentosComposicaoSaldo}
              servidorId={servidorSelecionado.id}
              anoReferencia={anoReferencia}
              mesReferencia={mesReferencia}
              competenciaDetalhada={competenciaDetalhada}
            />
          ) : null}

          <section className="hidden">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Servidor selecionado</p>
              <h2 className="mt-1 text-xl font-bold">
                {nomeServidor(servidorSelecionado)}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Matrícula {servidorSelecionado.matricula} -{" "}
                {servidorSelecionado.lotacoes?.[0]?.unidade.sigla ??
                  "Sem lotação na competência"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <RelatorioExportacaoButton
                href={`/api/relatorios/banco-horas/${servidorSelecionado.id}/pdf?ano=${anoReferencia}&mes=${mesReferencia}`}
                className="secp-theme-action inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition"
              >
                Exportar PDF
              </RelatorioExportacaoButton>

              {podeGerenciar && (
                <>
                  <form action={gerarMovimentosBancoHorasAction}>
                    <input type="hidden" name="servidorId" value={servidorSelecionado.id} />
                    <input type="hidden" name="anoReferencia" value={anoReferencia || ano} />
                    <input type="hidden" name="mesReferencia" value={mesReferencia || mes} />
                    <button
                      type="submit"
                      className="secp-theme-action inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition"
                    >
                      <RotateCw className="size-4" aria-hidden="true" />
                      Gerar movimentos
                    </button>
                  </form>

                  <form action={recalcularSaldoBancoHorasAction}>
                    <input type="hidden" name="servidorId" value={servidorSelecionado.id} />
                    <button
                      type="submit"
                      className="secp-theme-action inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition"
                    >
                      <RotateCw className="size-4" aria-hidden="true" />
                      Recalcular saldo
                    </button>
                  </form>

                  <form action={expirarDebitosVencidosAction}>
                    <input type="hidden" name="servidorId" value={servidorSelecionado.id} />
                    <button
                      type="submit"
                      className="secp-theme-action inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition"
                    >
                      <Landmark className="size-4" aria-hidden="true" />
                      Expirar debitos vencidos
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>

          <ResumoBancoHorasGrid
            creditosMes={creditosMes}
            limiteRestante={limiteRestante}
            creditosAVencer={creditosAVencer}
            debitosACompensar={debitosACompensar}
            limiteCredito={limiteCredito}
            limiteDebito={limiteDebito}
          />

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="space-y-5">
              <MovimentosBancoHorasTable
                movimentos={movimentos}
                podeGerenciar={podeGerenciar}
              />
              <AutorizacoesBancoHorasTable autorizacoes={autorizacoes} />
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24">
              <section className="rounded-xl border bg-[var(--card)] p-5 text-sm leading-6 text-[var(--muted-foreground)] shadow-sm">
                <h2 className="text-base font-bold text-[var(--foreground)]">
                  Como acompanhar o saldo
                </h2>
                <p className="mt-2">
                  A tabela mostra a composicao da competência selecionada. Os
                  painel acima indica saldo consolidado, pendências e limites
                  normativos para conferência antes da homologação.
                </p>
              </section>

              {podeGerenciar && (
                <AjusteManualBancoHorasForm
                  servidorId={servidorSelecionado.id}
                  anoReferencia={anoReferencia}
                  mesReferencia={mesReferencia}
                />
              )}

              {movimentosVencidos > 0 && (
                <section className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                  <AlertTriangle
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="font-bold">Movimentos com prazo vencido</h2>
                    <p className="mt-1">
                      Existem {minutosParaHoraBanco(movimentosVencidos)} em
                      movimentos com vencimento anterior a hoje. Revise antes da
                      homologação mensal.
                    </p>
                  </div>
                </section>
              )}

              {debitosVencidosParaDesconto > 0 && (
                <section className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                  <Landmark
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="font-bold">
                      Debitos prontos para desconto em folha
                    </h2>
                    <p className="mt-1">
                      Existem {minutosParaHoraBanco(debitosVencidosParaDesconto)} em
                      debitos validados cujo prazo de compensacao venceu.
                      Use a rotina de expiracao para retirar esses debitos do
                      saldo e registrar a providencia de desconto.
                    </p>
                  </div>
                </section>
              )}
            </aside>
          </section>
        </>
      ) : (
        <section className="rounded-xl border bg-[var(--card)] p-10 text-center text-sm text-[var(--muted-foreground)] shadow-sm">
          Nenhum servidor disponível para consulta de banco de horas.
        </section>
      )}
    </div>
  );
}

function ResumoBancoHorasGrid({
  creditosMes,
  limiteRestante,
  creditosAVencer,
  debitosACompensar,
  limiteCredito,
  limiteDebito,
}: {
  creditosMes: number;
  limiteRestante: number;
  creditosAVencer: number;
  debitosACompensar: number;
  limiteCredito: string | null;
  limiteDebito: string | null;
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Prazos e limites</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Indicadores de apoio para acompanhar limite mensal, vencimentos e
          compensações da competência selecionada.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoBancoHorasCard
          titulo="Crédito no mês"
          valor={minutosParaHoraBanco(creditosMes)}
          descricao="Créditos da competência selecionada."
          detalhe={`Limite ordinário: ${minutosParaHoraBanco(
            LIMITE_CREDITO_MENSAL_MINUTOS,
          )}.`}
          icon={TrendingUp}
        />
        <ResumoBancoHorasCard
          titulo="Limite restante"
          valor={minutosParaHoraBanco(limiteRestante)}
          descricao="Margem disponível no limite mensal."
          detalhe="Horas acima do limite não são computáveis."
          icon={CalendarClock}
        />
        <ResumoBancoHorasCard
          titulo="Créditos a vencer"
          valor={minutosParaHoraBanco(creditosAVencer)}
          descricao="Créditos válidos para fruição futura."
          detalhe={
            limiteCredito
              ? `Próximo prazo: ${limiteCredito}.`
              : "Sem prazo de usufruto aberto."
          }
          icon={CalendarClock}
        />
        <ResumoBancoHorasCard
          titulo="Débitos a compensar"
          valor={minutosParaHoraBanco(debitosACompensar)}
          descricao="Débitos ainda compensáveis no prazo."
          detalhe={
            limiteDebito
              ? `Compensar até ${limiteDebito}.`
              : "Sem prazo de compensação aberto."
          }
          icon={TrendingDown}
        />
      </div>
    </section>
  );
}

function ResumoBancoHorasCard({
  titulo,
  valor,
  descricao,
  detalhe,
  icon: Icon,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  detalhe: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-lg border bg-[var(--background)] p-4 text-[var(--card-foreground)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            {titulo}
          </p>
          <h3 className="mt-2 text-2xl font-bold">{valor}</h3>
        </div>
        <div className="secp-theme-icon rounded-lg p-3">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        {descricao}
      </p>
      <p className="mt-2 text-xs font-semibold text-[var(--foreground)]">
        {detalhe}
      </p>
    </article>
  );
}

function AjusteManualBancoHorasForm({
  servidorId,
  anoReferencia,
  mesReferencia,
}: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const dataPadrao = `${anoReferencia}-${String(mesReferencia).padStart(
    2,
    "0",
  )}-01`;

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <PlusCircle
          className="mt-0.5 size-5 text-[var(--muted-foreground)]"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">
            Ajuste administrativo
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Inclua credito ou debito autorizado por processo administrativo ou
            autoridade competente. O movimento entra validado e recalcula o
            saldo imediatamente.
          </p>
        </div>
      </div>

      <form action={incluirAjusteManualBancoHorasAction} className="mt-4 space-y-3">
        <input type="hidden" name="servidorId" value={servidorId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Natureza
            <select
              name="tipo"
              required
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
              defaultValue="CREDITO"
            >
              <option value="CREDITO">Credito</option>
              <option value="DEBITO">Debito</option>
            </select>
          </label>

          <label className="text-sm font-semibold">
            Data de referencia
            <input
              type="date"
              name="dataReferencia"
              required
              defaultValue={dataPadrao}
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold">
          Quantidade de horas
          <input
            type="number"
            name="horas"
            min="0.01"
            max="240"
            step="0.01"
            required
            placeholder="Ex.: 2.5"
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Processo SEI
            <input
              name="processoSei"
              maxLength={80}
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>

          <label className="text-sm font-semibold">
            Ato/autorizacao
            <input
              name="atoAutorizativo"
              maxLength={160}
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold">
          Autoridade
          <input
            name="autoridade"
            maxLength={160}
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          />
        </label>

        <label className="block text-sm font-semibold">
          Justificativa
          <textarea
            name="justificativa"
            required
            minLength={10}
            rows={4}
            className="mt-1 w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="secp-theme-primary-action inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition"
        >
          <PlusCircle className="size-4" aria-hidden="true" />
          Incluir ajuste
        </button>
      </form>
    </section>
  );
}

function AutorizacoesBancoHorasTable({
  autorizacoes,
}: {
  autorizacoes: AutorizacaoBancoHoras[];
}) {
  const rotulos: Record<string, string> = {
    CREDITO: "Geração de crédito",
    COMPENSACAO_CREDITO: "Utilização de crédito",
    COMPENSACAO_DEBITO: "Compensação de débito",
  };

  return (
    <section className="rounded-xl border bg-[var(--card)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Autorizações prévias da chefia</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
          Somente horas cobertas por autorização válida no período podem gerar
          crédito ou compensação no banco de horas.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Modalidade</th>
              <th className="px-5 py-3">Período</th>
              <th className="px-5 py-3">Autorizado</th>
              <th className="px-5 py-3">Utilizado</th>
              <th className="px-5 py-3">Chefia</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Solicitação</th>
            </tr>
          </thead>
          <tbody>
            {autorizacoes.map((autorizacao) => {
              const utilizados = autorizacao.movimentos.reduce(
                (total, movimento) => total + movimento.minutos,
                0,
              );

              return (
                <tr key={autorizacao.id} className="border-b last:border-0">
                  <td className="px-5 py-4 font-semibold">
                    {rotulos[autorizacao.tipo] ?? autorizacao.tipo}
                  </td>
                  <td className="px-5 py-4">
                    {formatarDataCivilBancoHoras(autorizacao.dataInicio)}
                    {" a "}
                    {formatarDataCivilBancoHoras(autorizacao.dataFim)}
                  </td>
                  <td className="px-5 py-4 font-mono">
                    {minutosParaHoraBanco(autorizacao.minutosAutorizados)}
                  </td>
                  <td className="px-5 py-4 font-mono">
                    {minutosParaHoraBanco(utilizados)}
                  </td>
                  <td className="px-5 py-4">{autorizacao.autorizadoPor.nome}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                      {autorizacao.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/solicitacoes/${autorizacao.solicitacao.id}`}
                      className="font-semibold text-[var(--secp-theme-accent)] underline-offset-4 hover:underline"
                    >
                      Ver solicitação
                    </Link>
                  </td>
                </tr>
              );
            })}

            {autorizacoes.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhuma autorização prévia cobre a competência selecionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

