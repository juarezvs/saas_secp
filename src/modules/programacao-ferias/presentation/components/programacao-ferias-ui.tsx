import Link from "next/link";
import { CalendarPlus, CheckCircle2, Pencil, Send, Trash2, XCircle } from "lucide-react";

import {
  atualizarProgramacaoFeriasAction,
  confirmarProgramacaoFeriasSarhAction,
  criarProgramacaoFeriasAction,
  deliberarProgramacaoFeriasAction,
  executarEnvioProgramacaoFeriasSarhAction,
  excluirProgramacaoFeriasAction,
} from "../../application/actions/programacao-ferias.actions";
import {
  classeStatusProgramacaoFerias,
  formatarDataFerias,
  programacaoFeriasPodeEditar,
  rotuloStatusProgramacaoFerias,
} from "../../application/services/programacao-ferias-status.service";
import type {
  ProgramacaoFeriasMapaItem,
  ProgramacaoFeriasSaldo,
} from "../../infrastructure/repositories/programacao-ferias.repository";

type ProgramacaoFeriasItem = {
  id: string;
  exercicio: number;
  dataInicio: Date;
  dataFim: Date;
  dias: number;
  status: string;
  integracaoStatus: string;
  observacaoServidor: string | null;
  observacaoChefia: string | null;
  integracaoErro?: string | null;
  servidor?: {
    matricula: string;
    usuario?: { nome: string } | null;
  };
  unidade?: { sigla: string; nome: string } | null;
  orgao?: { sigla: string } | null;
};

export function MensagemFerias({
  ok,
  erro,
}: {
  ok?: string;
  erro?: string;
}) {
  if (!ok && !erro) return null;

  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm font-medium ${
        erro
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          : "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
      }`}
    >
      {erro ?? ok}
    </div>
  );
}

export function StatusProgramacaoFeriasBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classeStatusProgramacaoFerias(
        status,
      )}`}
    >
      {rotuloStatusProgramacaoFerias(status)}
    </span>
  );
}

export function NovaProgramacaoFeriasCard({
  saldos,
  exercicioSelecionado,
}: {
  saldos: ProgramacaoFeriasSaldo[];
  exercicioSelecionado?: number | null;
}) {
  const saldosProgramaveis = saldos.filter((saldo) => saldo.diasDisponiveis > 0);
  const exercicioPadrao =
    saldosProgramaveis.some((saldo) => saldo.exercicio === exercicioSelecionado)
      ? exercicioSelecionado
      : saldosProgramaveis[0]?.exercicio;
  const semSaldoProgramavel = saldosProgramaveis.length === 0;

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3 border-b p-5">
        <span className="secp-theme-icon flex size-11 shrink-0 items-center justify-center rounded-lg">
          <CalendarPlus className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Marcar férias</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            O pedido fica disponível para alteração ou cancelamento até a chefia deliberar.
          </p>
        </div>
      </div>

      <form action={criarProgramacaoFeriasAction} className="grid gap-4 p-5 lg:grid-cols-[10rem_1fr_1fr_1.5fr_auto] lg:items-end">
        <label className="grid gap-1.5 text-sm font-semibold">
          Exercício
          <select
            name="exercicio"
            defaultValue={exercicioPadrao ?? ""}
            required
            disabled={semSaldoProgramavel}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {saldosProgramaveis.map((saldo) => (
              <option key={saldo.exercicio} value={saldo.exercicio}>
                {saldo.exercicio} - {saldo.diasDisponiveis} dia(s)
              </option>
            ))}
            {semSaldoProgramavel && (
              <option value="">Nenhum exercício disponível</option>
            )}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Início
          <input
            type="date"
            name="dataInicio"
            required
            disabled={semSaldoProgramavel}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Fim
          <input
            type="date"
            name="dataFim"
            required
            disabled={semSaldoProgramavel}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Observação
          <input
            name="observacaoServidor"
            maxLength={500}
            disabled={semSaldoProgramavel}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Opcional"
          />
        </label>
        <button
          disabled={semSaldoProgramavel}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-bold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="size-4" aria-hidden="true" />
          Enviar
        </button>
      </form>
    </section>
  );
}

export function SaldosFeriasCard({ saldos }: { saldos: ProgramacaoFeriasSaldo[] }) {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Saldo estimado por exercício</h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        O SECP considera férias já sincronizadas do SARH e programações ativas no próprio SECP.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {saldos.map((saldo) => (
          <div key={saldo.exercicio} className="rounded-md border bg-background p-4">
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Exercício {saldo.exercicio}
            </p>
            <p className="mt-2 text-3xl font-black">{saldo.diasDisponiveis}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              disponíveis de {saldo.diasDireito} dia(s)
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="rounded-md bg-[var(--muted)] px-2 py-1">
                SARH: {saldo.diasSarh}
              </span>
              <span className="rounded-md bg-[var(--muted)] px-2 py-1">
                SECP: {saldo.diasSecp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProgramacoesFeriasTable({
  programacoes,
  baseHref = "/minhas-ferias",
  mostrarServidor = false,
}: {
  programacoes: ProgramacaoFeriasItem[];
  baseHref?: string;
  mostrarServidor?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Programações no SECP</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Acompanhe o fluxo desde o envio para chefia até a confirmação no SARH.
        </p>
      </div>
      {programacoes.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
          Nenhuma programação registrada no SECP.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                {mostrarServidor && <th className="px-5 py-3">Servidor</th>}
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Exercício</th>
                <th className="px-5 py-3">Dias</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {programacoes.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  {mostrarServidor && (
                    <td className="px-5 py-4">
                      <p className="font-semibold">{item.servidor?.usuario?.nome ?? item.servidor?.matricula}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.unidade?.sigla ?? "-"} · {item.orgao?.sigla ?? "-"}
                      </p>
                    </td>
                  )}
                  <td className="px-5 py-4 font-medium">
                    {formatarDataFerias(item.dataInicio)} até {formatarDataFerias(item.dataFim)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{item.exercicio}</td>
                  <td className="px-5 py-4 font-mono text-xs">{item.dias}</td>
                  <td className="px-5 py-4">
                    <StatusProgramacaoFeriasBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`${baseHref}/${item.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-bold transition hover:bg-[var(--muted)]"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function valorDateInput(data: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(data);
}

export function FormEditarProgramacaoFerias({
  programacao,
  saldos,
}: {
  programacao: ProgramacaoFeriasItem;
  saldos: ProgramacaoFeriasSaldo[];
}) {
  const editavel = programacaoFeriasPodeEditar(programacao.status);

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Dados da programação</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Alterações só ficam disponíveis enquanto a chefia não aprovar ou reprovar.
        </p>
      </div>
      <form action={atualizarProgramacaoFeriasAction} className="grid gap-4 p-5 lg:grid-cols-[10rem_1fr_1fr_1.5fr_auto] lg:items-end">
        <input type="hidden" name="id" value={programacao.id} />
        <label className="grid gap-1.5 text-sm font-semibold">
          Exercício
          <select
            name="exercicio"
            defaultValue={programacao.exercicio}
            disabled={!editavel}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {saldos.map((saldo) => (
              <option key={saldo.exercicio} value={saldo.exercicio}>
                {saldo.exercicio} - {saldo.diasDisponiveis} dia(s)
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Início
          <input
            type="date"
            name="dataInicio"
            defaultValue={valorDateInput(programacao.dataInicio)}
            disabled={!editavel}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Fim
          <input
            type="date"
            name="dataFim"
            defaultValue={valorDateInput(programacao.dataFim)}
            disabled={!editavel}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Observação
          <input
            name="observacaoServidor"
            defaultValue={programacao.observacaoServidor ?? ""}
            disabled={!editavel}
            maxLength={500}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <button
          disabled={!editavel}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-bold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Salvar
        </button>
      </form>

      {editavel && (
        <form action={excluirProgramacaoFeriasAction} className="border-t p-5">
          <input type="hidden" name="id" value={programacao.id} />
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950">
            <Trash2 className="size-4" aria-hidden="true" />
            Cancelar programação
          </button>
        </form>
      )}
    </section>
  );
}

export function DeliberacaoProgramacaoFeriasForm({
  programacaoId,
}: {
  programacaoId: string;
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Deliberação da chefia</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          A aprovação libera a programação para execução pela SECAP/SEPAG.
        </p>
      </div>
      <form action={deliberarProgramacaoFeriasAction} className="grid gap-4 p-5">
        <input type="hidden" name="id" value={programacaoId} />
        <label className="grid gap-1.5 text-sm font-semibold">
          Observação da chefia
          <textarea
            name="observacaoChefia"
            rows={4}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            name="decisao"
            value="aprovar"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-green-700 px-4 text-sm font-bold text-white transition hover:bg-green-800"
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Aprovar
          </button>
          <button
            name="decisao"
            value="devolver"
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-bold transition hover:bg-[var(--muted)]"
          >
            Devolver
          </button>
          <button
            name="decisao"
            value="reprovar"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950"
          >
            <XCircle className="size-4" aria-hidden="true" />
            Reprovar
          </button>
        </div>
      </form>
    </section>
  );
}

const meses = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function itemNoMes(item: ProgramacaoFeriasMapaItem, ano: number, mes: number) {
  const inicioMes = new Date(Date.UTC(ano, mes, 1));
  const proximoMes = new Date(Date.UTC(ano, mes + 1, 1));

  return item.dataInicio < proximoMes && item.dataFim >= inicioMes;
}

function classeOrigemMapa(origem: ProgramacaoFeriasMapaItem["origem"]) {
  if (origem === "PREVIA") return "border-purple-500 bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-100";
  if (origem === "SECP") return "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100";
  return "border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100";
}

export function MapaFeriasAnual({
  ano,
  itens,
  titulo = "Mapa anual de férias",
}: {
  ano: number;
  itens: ProgramacaoFeriasMapaItem[];
  titulo?: string;
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold">{titulo}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Visualização anual com férias SARH, programações SECP e prévia de aprovação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full border border-green-200 px-2 py-1">SARH</span>
          <span className="rounded-full border border-blue-200 px-2 py-1">SECP</span>
          <span className="rounded-full border border-purple-200 px-2 py-1">Prévia</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {meses.map((mes, indice) => {
          const itensMes = itens.filter((item) => itemNoMes(item, ano, indice));

          return (
            <article key={mes} className="min-h-48 rounded-md border bg-background p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black">{mes}</h3>
                <span className="rounded-full bg-[var(--muted)] px-2 py-1 text-xs font-bold">
                  {itensMes.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {itensMes.slice(0, 6).map((item) => (
                  <div
                    key={`${mes}-${item.origem}-${item.id}`}
                    className={`rounded-md border-l-4 px-2.5 py-2 text-xs ${classeOrigemMapa(
                      item.origem,
                    )}`}
                  >
                    <p className="truncate font-bold">{item.servidorNome}</p>
                    <p className="truncate opacity-80">
                      {formatarDataFerias(item.dataInicio)} até {formatarDataFerias(item.dataFim)}
                    </p>
                    <p className="truncate opacity-80">
                      {item.unidadeSigla} · {item.statusLabel}
                    </p>
                  </div>
                ))}
                {itensMes.length > 6 && (
                  <div className="rounded-md border border-dashed p-2 text-center text-xs font-bold text-[var(--muted-foreground)]">
                    +{itensMes.length - 6} período(s)
                  </div>
                )}
                {itensMes.length === 0 && (
                  <div className="rounded-md border border-dashed p-5 text-center text-xs text-[var(--muted-foreground)]">
                    Sem férias no mês.
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function IntegracaoSarhFeriasTable({
  programacoes,
}: {
  programacoes: ProgramacaoFeriasItem[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Fila de envio ao SARH</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Registros aprovados pela chefia aguardam execução controlada pela área responsável.
        </p>
      </div>
      {programacoes.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
          Nenhuma programação pendente de envio.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Servidor</th>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Erro</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {programacoes.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{item.servidor?.usuario?.nome ?? item.servidor?.matricula}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.unidade?.sigla ?? "-"} · {item.orgao?.sigla ?? "-"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {formatarDataFerias(item.dataInicio)} até {formatarDataFerias(item.dataFim)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusProgramacaoFeriasBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="max-w-sm truncate text-xs text-[var(--muted-foreground)]">
                      {item.integracaoErro ?? "-"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <form action={executarEnvioProgramacaoFeriasSarhAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button className="inline-flex h-9 items-center justify-center rounded-md bg-blue-900 px-3 text-xs font-bold text-white transition hover:bg-blue-950">
                          Enviar SARH
                        </button>
                      </form>
                      <form action={confirmarProgramacaoFeriasSarhAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-bold transition hover:bg-[var(--muted)]">
                          Confirmar retorno
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
