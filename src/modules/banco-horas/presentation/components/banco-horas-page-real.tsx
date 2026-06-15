import Link from "next/link";
import { AlertTriangle, FileDown, Hourglass, RotateCw } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { CompetenciaInput } from "@/components/ui";
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
  autorizacoes: AutorizacaoBancoHoras[];
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

function competenciaParaInput(anoReferencia: number, mesReferencia: number) {
  return `${anoReferencia}-${String(mesReferencia).padStart(2, "0")}`;
}

export function BancoHorasPageReal({
  servidores,
  servidorSelecionado,
  movimentos,
  autorizacoes,
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
        icon={Hourglass}
        titulo="Banco de horas"
        descricao="Acompanhe saldo individual, creditos, debitos, compensacoes, limites mensais e prazos regulamentares."
        artigo="Banco de horas"
        regraTitulo="Limite e compensacao"
        regraDescricao="Créditos e compensações dependem de autorização prévia da chefia. O limite ordinário de crédito para fruição futura é de 16h mensais."
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div>
            <label htmlFor="servidorId" className="text-sm font-semibold">
              Servidor
            </label>
            <select
              id="servidorId"
              name="servidorId"
              defaultValue={servidorSelecionado?.id ?? ""}
              disabled={!podeConsultarGlobal}
              className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {servidores.map((servidor) => (
                <option key={servidor.id} value={servidor.id}>
                  {servidor.matricula} - {servidor.usuario.nome}
                </option>
              ))}
            </select>
          </div>

          <CompetenciaInput
            defaultValue={competenciaParaInput(anoReferencia, mesReferencia)}
          />

          <button
            type="submit"
            className="h-10 rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)]"
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

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="space-y-5">
              <MovimentosBancoHorasTable movimentos={movimentos} />
              <AutorizacoesBancoHorasTable autorizacoes={autorizacoes} />
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24">
              <section className="rounded-xl border bg-[var(--card)] p-5 text-sm leading-6 text-[var(--muted-foreground)] shadow-sm">
                <h2 className="text-base font-bold text-[var(--foreground)]">
                  Como acompanhar o saldo
                </h2>
                <p className="mt-2">
                  A tabela mostra a composicao da competencia selecionada. Os
                  cards abaixo indicam saldo consolidado, pendencias e limites
                  normativos para conferencia antes da homologacao.
                </p>
              </section>

              <BancoHorasCard
                saldo={servidorSelecionado.bancoHorasSaldo}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"
              />

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
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
                  <AlertTriangle
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="font-bold">Movimentos com prazo vencido</h2>
                    <p className="mt-1">
                      Existem {minutosParaHoraBanco(movimentosVencidos)} em
                      movimentos com vencimento anterior a hoje. Revise antes da
                      homologacao mensal.
                    </p>
                  </div>
                </section>
              )}
            </aside>
          </section>
        </>
      ) : (
        <section className="rounded-xl border bg-[var(--card)] p-10 text-center text-sm text-[var(--muted-foreground)] shadow-sm">
          Nenhum servidor disponivel para consulta de banco de horas.
        </section>
      )}
    </div>
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
                    {new Intl.DateTimeFormat("pt-BR").format(autorizacao.dataInicio)}
                    {" a "}
                    {new Intl.DateTimeFormat("pt-BR").format(autorizacao.dataFim)}
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
                      className="font-semibold text-blue-800 underline-offset-4 hover:underline dark:text-blue-300"
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
