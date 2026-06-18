import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Clock3,
  FileDown,
  Hourglass,
  PlusCircle,
  RotateCw,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { CompetenciaInput, SearchableSelect } from "@/components/ui";
import { gerarMovimentosBancoHorasAction } from "../../application/actions/gerar-movimento-banco-horas.action";
import { incluirAjusteManualBancoHorasAction } from "../../application/actions/incluir-ajuste-manual-banco-horas.action";
import { recalcularSaldoBancoHorasAction } from "../../application/actions/recalcular-saldo-banco-horas.action";
import { LIMITE_CREDITO_MENSAL_MINUTOS } from "../../application/services/aplicar-limites-banco-horas.service";
import { minutosParaHoraBanco } from "../../application/services/formatar-banco-horas.service";
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
  return data ? new Intl.DateTimeFormat("pt-BR").format(data) : null;
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
  const limiteCredito = formatarDataLimite(
    menorDataLimite(movimentos, (movimento) => movimento.tipo === "CREDITO"),
  );
  const limiteDebito = formatarDataLimite(
    menorDataLimite(movimentos, (movimento) => movimento.tipo === "DEBITO"),
  );
  const { ano, mes } = referenciaAtual();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Banco de horas" }]} />

      <PageHeader
        icon={Hourglass}
        titulo="Banco de horas"
        descricao="Acompanhe saldo individual, créditos, débitos, compensações, limites mensais e prazos regulamentares."
        artigo="Banco de horas"
        regraTitulo="Limite e compensação"
        regraDescricao="Créditos e compensações dependem de autorização prévia da chefia. O limite ordinário de crédito para fruição futura é de 16h mensais."
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div>
            <label htmlFor="servidorId" className="text-sm font-semibold">
              Servidor
            </label>
            <SearchableSelect
              id="servidorId"
              name="servidorId"
              defaultValue={servidorSelecionado?.id ?? ""}
              disabled={!podeConsultarGlobal}
              className="mt-2"
              searchPlaceholder="Pesquisar por matrícula ou nome..."
              options={servidores.map((servidor) => ({
                value: servidor.id,
                label: `${servidor.matricula} — ${servidor.usuario.nome}`,
              }))}
            />
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
                Matrícula {servidorSelecionado.matricula} -{" "}
                {servidorSelecionado.lotacoes?.[0]?.unidade.sigla ??
                  "Sem lotação na competência"}
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

          <ResumoBancoHorasGrid
            saldo={servidorSelecionado.bancoHorasSaldo}
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
  saldo,
  creditosMes,
  limiteRestante,
  creditosAVencer,
  debitosACompensar,
  limiteCredito,
  limiteDebito,
}: {
  saldo: ServidorBancoHoras["bancoHorasSaldo"];
  creditosMes: number;
  limiteRestante: number;
  creditosAVencer: number;
  debitosACompensar: number;
  limiteCredito: string | null;
  limiteDebito: string | null;
}) {
  const dados = dadosSaldoPadrao(saldo);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ResumoBancoHorasCard
        titulo="Saldo atual"
        valor={minutosParaHoraBanco(dados.saldoMinutos)}
        descricao="Créditos validados menos débitos validados."
        detalhe="Saldo consolidado do servidor."
        icon={Banknote}
      />
      <ResumoBancoHorasCard
        titulo="Créditos validados"
        valor={minutosParaHoraBanco(dados.creditosValidadosMinutos)}
        descricao="Horas efetivamente incorporadas ao banco."
        detalhe={
          limiteCredito
            ? `Usufruto/compensação até ${limiteCredito}.`
            : "Sem crédito com vencimento aberto."
        }
        icon={TrendingUp}
      />
      <ResumoBancoHorasCard
        titulo="Débitos validados"
        valor={minutosParaHoraBanco(dados.debitosValidadosMinutos)}
        descricao="Horas negativas confirmadas no saldo."
        detalhe={
          limiteDebito
            ? `Compensação até ${limiteDebito}.`
            : "Sem débito com vencimento aberto."
        }
        icon={TrendingDown}
      />
      <ResumoBancoHorasCard
        titulo="Pendências"
        valor={`${minutosParaHoraBanco(
          dados.creditosPendentesMinutos,
        )} / ${minutosParaHoraBanco(dados.debitosPendentesMinutos)}`}
        descricao="Créditos e débitos pendentes de validação."
        detalhe="Crédito / débito aguardando conferência."
        icon={Clock3}
      />
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
    <article className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            {titulo}
          </p>
          <h3 className="mt-2 text-2xl font-bold">{valor}</h3>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-200">
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
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90"
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

