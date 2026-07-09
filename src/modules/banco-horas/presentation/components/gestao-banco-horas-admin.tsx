import Link from "next/link";
import { ArrowLeft, FileDown, Save, Shuffle, UserCog } from "lucide-react";

import { CompetenciaInput } from "@/components/ui";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { minutosParaHoraBanco } from "../../application/services/formatar-banco-horas.service";
import {
  configurarBancoHorasServidorAction,
  transferirSaldoBancoHorasAction,
} from "../../application/actions/gerenciar-banco-horas-admin.actions";

type ServidorGestaoBancoHoras = {
  id: string;
  matricula: string;
  nomeFuncional?: string | null;
  orgao: { sigla: string; nome: string };
  usuario: { nome: string };
  bancoHorasSaldo: {
    saldoMinutos: number;
    saldoInicialCreditoMinutos: number;
    saldoInicialDebitoMinutos: number;
    competenciaInicioControle: string | null;
  } | null;
  lotacoes: Array<{
    unidade: { sigla: string; nome: string };
  }>;
};

type MovimentoTransferivel = {
  id: string;
  dataReferencia: Date;
  anoReferencia: number;
  mesReferencia: number;
  tipo: string;
  status: string;
  minutos: number;
  expiraEm: Date | null;
};

type ConsolidadoCompetencia = {
  anoReferencia: number;
  mesReferencia: number;
  tipo: string;
  status: string;
  _sum: {
    minutos: number | null;
  };
};

function saldoPadrao(servidor: ServidorGestaoBancoHoras) {
  return (
    servidor.bancoHorasSaldo ?? {
      saldoMinutos: 0,
      saldoInicialCreditoMinutos: 0,
      saldoInicialDebitoMinutos: 0,
      competenciaInicioControle: null,
    }
  );
}

function unidadeAtual(servidor: ServidorGestaoBancoHoras) {
  return servidor.lotacoes[0]?.unidade.sigla ?? "-";
}

function formatarCompetencia(competencia?: string | null) {
  if (!competencia) {
    return "-";
  }

  const [ano, mes] = competencia.split("-");
  return `${mes}/${ano}`;
}

function formatarData(data: Date | null) {
  return data ? new Intl.DateTimeFormat("pt-BR").format(data) : "-";
}

function competenciaAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function resumirCompetencias(consolidado: ConsolidadoCompetencia[]) {
  const mapa = new Map<
    string,
    {
      chave: string;
      creditos: number;
      debitos: number;
      compensacoesCredito: number;
      compensacoesDebito: number;
      pendentes: number;
    }
  >();

  for (const item of consolidado) {
    const chave = `${item.anoReferencia}-${String(item.mesReferencia).padStart(2, "0")}`;
    const atual =
      mapa.get(chave) ??
      {
        chave,
        creditos: 0,
        debitos: 0,
        compensacoesCredito: 0,
        compensacoesDebito: 0,
        pendentes: 0,
      };
    const minutos = item._sum.minutos ?? 0;

    if (item.status === "PENDENTE") {
      atual.pendentes += minutos;
    }

    if (item.tipo === "CREDITO") {
      atual.creditos += minutos;
    }

    if (item.tipo === "DEBITO") {
      atual.debitos += minutos;
    }

    if (item.tipo === "COMPENSACAO_CREDITO") {
      atual.compensacoesCredito += minutos;
    }

    if (item.tipo === "COMPENSACAO_DEBITO") {
      atual.compensacoesDebito += minutos;
    }

    mapa.set(chave, atual);
  }

  return Array.from(mapa.values()).sort((a, b) => b.chave.localeCompare(a.chave));
}

export function GestaoBancoHorasListagem({
  servidores,
  busca,
}: {
  servidores: ServidorGestaoBancoHoras[];
  busca?: string;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <label className="text-sm font-semibold">
            Pesquisar servidor
            <input
              name="busca"
              defaultValue={busca ?? ""}
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
              placeholder="Nome ou matrícula"
            />
          </label>

          <button
            type="submit"
            className="h-10 rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            Filtrar
          </button>

          <Link
            href="/api/administracao/banco-horas/exportar"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            <FileDown className="size-4" aria-hidden="true" />
            Exportar
          </Link>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Servidor</th>
                <th className="px-5 py-3">Seccional</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Início do controle</th>
                <th className="px-5 py-3">Inicial positivo</th>
                <th className="px-5 py-3">Inicial negativo</th>
                <th className="px-5 py-3">Saldo atual</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {servidores.map((servidor) => {
                const saldo = saldoPadrao(servidor);

                return (
                  <tr key={servidor.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{nomeServidor(servidor)}</div>
                      <div className="font-mono text-xs text-[var(--muted-foreground)]">
                        {servidor.matricula}
                      </div>
                    </td>
                    <td className="px-5 py-4">{servidor.orgao.sigla}</td>
                    <td className="px-5 py-4">{unidadeAtual(servidor)}</td>
                    <td className="px-5 py-4">
                      {formatarCompetencia(saldo.competenciaInicioControle)}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {minutosParaHoraBanco(saldo.saldoInicialCreditoMinutos)}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {minutosParaHoraBanco(saldo.saldoInicialDebitoMinutos)}
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold">
                      {minutosParaHoraBanco(saldo.saldoMinutos)}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/administracao/banco-horas/${servidor.id}`}
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition hover:bg-[var(--muted)]"
                      >
                        <UserCog className="size-4" aria-hidden="true" />
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {servidores.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum servidor encontrado no escopo da seccional.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function GestaoBancoHorasDetalhe({
  servidor,
  movimentosTransferiveis,
  consolidado,
}: {
  servidor: ServidorGestaoBancoHoras;
  movimentosTransferiveis: MovimentoTransferivel[];
  consolidado: ConsolidadoCompetencia[];
}) {
  const saldo = saldoPadrao(servidor);
  const competencias = resumirCompetencias(consolidado);

  return (
    <div className="space-y-5">
      <Link
        href="/administracao/banco-horas"
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:underline dark:text-blue-300"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para a gestão
      </Link>

      <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-xl font-bold">{nomeServidor(servidor)}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {servidor.matricula} - {servidor.orgao.sigla} -{" "}
              {unidadeAtual(servidor)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Indicador titulo="Saldo atual" valor={minutosParaHoraBanco(saldo.saldoMinutos)} />
            <Indicador
              titulo="Início"
              valor={formatarCompetencia(saldo.competenciaInicioControle)}
            />
            <Indicador
              titulo="Inicial positivo"
              valor={minutosParaHoraBanco(saldo.saldoInicialCreditoMinutos)}
            />
            <Indicador
              titulo="Inicial negativo"
              valor={minutosParaHoraBanco(saldo.saldoInicialDebitoMinutos)}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <div className="space-y-5">
          <ConsolidadoCompetenciasTable competencias={competencias} />
          <MovimentosTransferiveisTable movimentos={movimentosTransferiveis} />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <ConfigurarParametrosForm servidor={servidor} />
          <TransferirSaldoForm servidorId={servidor.id} />
        </aside>
      </section>
    </div>
  );
}

function Indicador({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-[var(--background)] p-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {titulo}
      </p>
      <p className="mt-1 font-mono text-lg font-bold">{valor}</p>
    </div>
  );
}

function ConfigurarParametrosForm({
  servidor,
}: {
  servidor: ServidorGestaoBancoHoras;
}) {
  const saldo = saldoPadrao(servidor);

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <h2 className="text-base font-bold">Parâmetros iniciais</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
        Defina a competência a partir da qual o SECP controlará o banco de horas
        e registre o saldo herdado do controle paralelo.
      </p>

      <form action={configurarBancoHorasServidorAction} className="mt-4 space-y-3">
        <input type="hidden" name="servidorId" value={servidor.id} />

        <CompetenciaInput
          id="competenciaInicioControle"
          name="competenciaInicioControle"
          label="Competência inicial"
          defaultValue={saldo.competenciaInicioControle ?? competenciaAtual()}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Saldo inicial positivo
            <input
              name="saldoInicialCreditoHoras"
              type="number"
              min="0"
              max="9999"
              step="0.01"
              defaultValue={saldo.saldoInicialCreditoMinutos / 60}
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>

          <label className="text-sm font-semibold">
            Saldo inicial negativo
            <input
              name="saldoInicialDebitoHoras"
              type="number"
              min="0"
              max="9999"
              step="0.01"
              defaultValue={saldo.saldoInicialDebitoMinutos / 60}
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold">
          Processo SEI
          <input
            name="processoSei"
            maxLength={80}
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          />
        </label>

        <label className="block text-sm font-semibold">
          Ato/autorização
          <input
            name="atoAutorizativo"
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
            defaultValue="Implantação do controle de banco de horas no SECP."
          />
        </label>

        <button
          type="submit"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90"
        >
          <Save className="size-4" aria-hidden="true" />
          Salvar parâmetros
        </button>
      </form>
    </section>
  );
}

function TransferirSaldoForm({ servidorId }: { servidorId: string }) {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <h2 className="text-base font-bold">Transferência excepcional</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
        Prorrogue saldo expirado ou a expirar para meses futuros mediante
        decisão do diretor do foro.
      </p>

      <form action={transferirSaldoBancoHorasAction} className="mt-4 space-y-3">
        <input type="hidden" name="servidorId" value={servidorId} />

        <label className="text-sm font-semibold">
          Natureza do saldo
          <select
            name="tipo"
            defaultValue="CREDITO"
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          >
            <option value="CREDITO">Positivo</option>
            <option value="DEBITO">Negativo</option>
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Venceu ou vence até
            <input
              type="date"
              name="expiraAte"
              required
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>

          <label className="text-sm font-semibold">
            Nova validade
            <input
              type="date"
              name="novaExpiracao"
              required
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold">
          Processo SEI
          <input
            name="processoSei"
            maxLength={80}
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          />
        </label>

        <label className="block text-sm font-semibold">
          Decisão do diretor do foro
          <input
            name="decisaoDiretorForo"
            required
            maxLength={160}
            placeholder="Ex.: Despacho/Portaria ..."
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
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-amber-200 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950"
        >
          <Shuffle className="size-4" aria-hidden="true" />
          Transferir saldo
        </button>
      </form>
    </section>
  );
}

function ConsolidadoCompetenciasTable({
  competencias,
}: {
  competencias: ReturnType<typeof resumirCompetencias>;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-[var(--card)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Consolidado por competência</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Competência</th>
              <th className="px-5 py-3">Créditos</th>
              <th className="px-5 py-3">Débitos</th>
              <th className="px-5 py-3">Comp. crédito</th>
              <th className="px-5 py-3">Comp. débito</th>
              <th className="px-5 py-3">Pendentes</th>
            </tr>
          </thead>
          <tbody>
            {competencias.map((item) => (
              <tr key={item.chave} className="border-b last:border-b-0">
                <td className="px-5 py-4 font-semibold">
                  {formatarCompetencia(item.chave)}
                </td>
                <td className="px-5 py-4 font-mono">
                  {minutosParaHoraBanco(item.creditos)}
                </td>
                <td className="px-5 py-4 font-mono">
                  {minutosParaHoraBanco(item.debitos)}
                </td>
                <td className="px-5 py-4 font-mono">
                  {minutosParaHoraBanco(item.compensacoesCredito)}
                </td>
                <td className="px-5 py-4 font-mono">
                  {minutosParaHoraBanco(item.compensacoesDebito)}
                </td>
                <td className="px-5 py-4 font-mono">
                  {minutosParaHoraBanco(item.pendentes)}
                </td>
              </tr>
            ))}

            {competencias.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Ainda não há movimentos de banco de horas para consolidar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MovimentosTransferiveisTable({
  movimentos,
}: {
  movimentos: MovimentoTransferivel[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-[var(--card)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Saldos com prazo</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Competência</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Saldo</th>
              <th className="px-5 py-3">Validade</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {movimentos.map((movimento) => (
              <tr key={movimento.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">{formatarData(movimento.dataReferencia)}</td>
                <td className="px-5 py-4">
                  {formatarCompetencia(
                    `${movimento.anoReferencia}-${String(movimento.mesReferencia).padStart(2, "0")}`,
                  )}
                </td>
                <td className="px-5 py-4">
                  {movimento.tipo === "CREDITO" ? "Positivo" : "Negativo"}
                </td>
                <td className="px-5 py-4 font-mono">
                  {minutosParaHoraBanco(movimento.minutos)}
                </td>
                <td className="px-5 py-4">{formatarData(movimento.expiraEm)}</td>
                <td className="px-5 py-4">{movimento.status}</td>
              </tr>
            ))}

            {movimentos.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum saldo com prazo encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
