import Link from "next/link";
import { AlertTriangle, CalendarClock, FileDown, RotateCw } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { gerarMovimentosBancoHorasAction } from "../../application/actions/gerar-movimento-banco-horas.action";
import { recalcularSaldoBancoHorasAction } from "../../application/actions/recalcular-saldo-banco-horas.action";
import { LIMITE_CREDITO_MENSAL_MINUTOS } from "../../application/services/aplicar-limites-banco-horas.service";
import { minutosParaHoraBanco } from "../../application/services/formatar-banco-horas.service";
import { BancoHorasCard } from "./banco-horas-card";
import { MovimentosBancoHorasTable } from "./movimentos-banco-horas-table";

type ServidorBancoHoras = {
  id: string;
  matricula: string;
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
  tipo: string;
  origem: string;
  status: string;
  minutos: number;
  descricao: string | null;
  expiraEm: Date | null;
};

type BancoHorasPageRealProps = {
  servidores: ServidorBancoHoras[];
  servidorSelecionado: ServidorBancoHoras | null;
  movimentos: MovimentoBancoHoras[];
  anoReferencia: number;
  mesReferencia: number;
  podeConsultarGlobal: boolean;
  podeGerenciar: boolean;
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

function referenciaAtual() {
  const data = new Date();

  return {
    ano: data.getFullYear(),
    mes: data.getMonth() + 1,
  };
}

export function BancoHorasPageReal({
  servidores,
  servidorSelecionado,
  movimentos,
  anoReferencia,
  mesReferencia,
  podeConsultarGlobal,
  podeGerenciar,
}: BancoHorasPageRealProps) {
  const creditosMes = totalCreditosMes(movimentos);
  const limiteRestante = Math.max(0, LIMITE_CREDITO_MENSAL_MINUTOS - creditosMes);
  const creditosAVencer = totalCreditosAVencer(movimentos);
  const debitosACompensar = totalDebitosACompensar(movimentos);
  const movimentosVencidos = totalMovimentosVencidos(movimentos);
  const { ano, mes } = referenciaAtual();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Banco de horas" }]} />

      <PageHeader
        icon={CalendarClock}
        titulo="Banco de horas"
        descricao="Acompanhe saldo individual, creditos, debitos, compensacoes, limites mensais e prazos regulamentares."
        artigo="Portaria SJAM-DIREF 135/2025"
        regraTitulo="16h mensais e ate 3 meses"
        regraDescricao="Creditos e debitos exigem controle, autorizacao e compensacao em ate 3 meses."
      />

      <RegraPortariaCard
        artigo="Banco de horas"
        titulo="Limite e compensacao"
        descricao="O limite ordinario de credito para fruicao futura e de 16h mensais. Horas acima do limite ficam separadas e nao entram no saldo, salvo referendo competente."
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_120px_auto] md:items-end">
          <div className="space-y-2">
            <label htmlFor="servidorId" className="text-sm font-semibold">
              Servidor
            </label>
            <select
              id="servidorId"
              name="servidorId"
              defaultValue={servidorSelecionado?.id ?? ""}
              disabled={!podeConsultarGlobal}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {servidores.map((servidor) => (
                <option key={servidor.id} value={servidor.id}>
                  {servidor.matricula} - {servidor.usuario.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="mesReferencia" className="text-sm font-semibold">
              Mes
            </label>
            <input
              id="mesReferencia"
              name="mesReferencia"
              type="number"
              min={1}
              max={12}
              defaultValue={mesReferencia}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="anoReferencia" className="text-sm font-semibold">
              Ano
            </label>
            <input
              id="anoReferencia"
              name="anoReferencia"
              type="number"
              min={2024}
              max={2100}
              defaultValue={anoReferencia}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </div>

          <button
            type="submit"
            className="h-11 rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            Aplicar
          </button>
        </form>
      </section>

      {servidorSelecionado ? (
        <>
          <section className="flex flex-col justify-between gap-3 rounded-xl border bg-[var(--card)] p-5 shadow-sm md:flex-row md:items-center">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Servidor selecionado</p>
              <h2 className="mt-1 text-xl font-bold">
                {servidorSelecionado.usuario.nome}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Matricula {servidorSelecionado.matricula} -{" "}
                {servidorSelecionado.lotacoes?.[0]?.unidade.sigla ?? "Sem lotacao ativa"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/api/relatorios/banco-horas/${servidorSelecionado.id}/pdf?ano=${anoReferencia}&mes=${mesReferencia}`}
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
              >
                <FileDown className="size-4" aria-hidden="true" />
                Exportar PDF
              </Link>

              {podeGerenciar && (
                <>
                  <form action={gerarMovimentosBancoHorasAction}>
                    <input type="hidden" name="servidorId" value={servidorSelecionado.id} />
                    <input type="hidden" name="anoReferencia" value={anoReferencia || ano} />
                    <input type="hidden" name="mesReferencia" value={mesReferencia || mes} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
                    >
                      <RotateCw className="size-4" aria-hidden="true" />
                      Gerar movimentos
                    </button>
                  </form>

                  <form action={recalcularSaldoBancoHorasAction}>
                    <input type="hidden" name="servidorId" value={servidorSelecionado.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
                    >
                      <RotateCw className="size-4" aria-hidden="true" />
                      Recalcular saldo
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>

          <BancoHorasCard saldo={servidorSelecionado.bancoHorasSaldo} />

          <section className="grid gap-4 md:grid-cols-4">
            <ResumoNormativo
              titulo="Credito no mes"
              valor={minutosParaHoraBanco(creditosMes)}
              descricao={`Limite ordinario: ${minutosParaHoraBanco(
                LIMITE_CREDITO_MENSAL_MINUTOS,
              )}`}
            />
            <ResumoNormativo
              titulo="Limite restante"
              valor={minutosParaHoraBanco(limiteRestante)}
              descricao="Horas acima do limite ficam nao computaveis."
            />
            <ResumoNormativo
              titulo="Creditos a vencer"
              valor={minutosParaHoraBanco(creditosAVencer)}
              descricao="Compensacao em ate 3 meses."
            />
            <ResumoNormativo
              titulo="Debitos a compensar"
              valor={minutosParaHoraBanco(debitosACompensar)}
              descricao="Debito nao compensado pode gerar notificacao."
            />
          </section>

          {movimentosVencidos > 0 && (
            <section className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-bold">Movimentos com prazo vencido</h2>
                <p className="mt-1">
                  Existem {minutosParaHoraBanco(movimentosVencidos)} em movimentos com
                  vencimento anterior a hoje. Revise antes da homologacao mensal.
                </p>
              </div>
            </section>
          )}

          <MovimentosBancoHorasTable movimentos={movimentos} />
        </>
      ) : (
        <section className="rounded-xl border bg-[var(--card)] p-10 text-center text-sm text-[var(--muted-foreground)] shadow-sm">
          Nenhum servidor disponivel para consulta de banco de horas.
        </section>
      )}
    </div>
  );
}

function ResumoNormativo({
  titulo,
  valor,
  descricao,
}: {
  titulo: string;
  valor: string;
  descricao: string;
}) {
  return (
    <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <p className="text-sm text-[var(--muted-foreground)]">{titulo}</p>
      <h3 className="mt-2 text-2xl font-bold">{valor}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {descricao}
      </p>
    </article>
  );
}
