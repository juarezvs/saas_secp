import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  Hourglass,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  classificarPrazoBancoHoras,
  rotuloClassificacaoPrazoBancoHoras,
} from "@/modules/banco-horas/application/services/classificar-prazo-banco-horas.service";
import { tratarPendenciaBancoHorasAction } from "@/modules/banco-horas/application/actions/tratar-pendencia-banco-horas.action";
import {
  minutosParaHoraBanco,
  rotuloTipoMovimentoBancoHoras,
} from "@/modules/banco-horas/application/services/formatar-banco-horas.service";
import { listarPainelChefiaBancoHoras } from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

function somar<T>(itens: T[], seletor: (item: T) => number | null | undefined) {
  return itens.reduce((total, item) => total + (seletor(item) ?? 0), 0);
}

function unidadeServidor(servidor: { lotacoes?: Array<{ unidade: { sigla: string } }> }) {
  return servidor.lotacoes?.[0]?.unidade.sigla ?? "Sem unidade ativa";
}

function rotuloSolicitacao(tipo: string) {
  const rotulos: Record<string, string> = {
    HORA_CREDITO_PREVIA: "Gerar crédito",
    FOLGA_BANCO_HORAS: "Utilizar saldo",
    COMPENSACAO: "Compensar débito",
  };

  return rotulos[tipo] ?? tipo;
}

function prazoStatus(expiraEm: Date | null) {
  return rotuloClassificacaoPrazoBancoHoras(
    classificarPrazoBancoHoras({ prazo: expiraEm }),
  );
}

function Indicador({
  titulo,
  valor,
  detalhe,
  icon: Icon,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  icon: typeof UsersRound;
}) {
  return (
    <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            {titulo}
          </p>
          <p className="mt-2 text-2xl font-bold">{valor}</p>
        </div>
        <span className="secp-theme-icon rounded-lg p-3">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">{detalhe}</p>
    </article>
  );
}

export default async function BancoHorasChefiaPage() {
  const permissao = await exigirPermissaoOuRedirecionar(
    "banco-horas:consultar:chefia",
  );
  const painel = permissao.usuarioId
    ? await listarPainelChefiaBancoHoras({ usuarioId: permissao.usuarioId })
    : {
        servidores: [],
        solicitacoesPendentes: [],
        vencimentos: [],
        movimentosSemAutorizacao: [],
      };
  const servidoresComCredito = painel.servidores.filter(
    (servidor) => (servidor.bancoHorasSaldo?.saldoMinutos ?? 0) > 0,
  ).length;
  const servidoresComDebito = painel.servidores.filter(
    (servidor) => (servidor.bancoHorasSaldo?.saldoMinutos ?? 0) < 0,
  ).length;
  const totalCredito = somar(
    painel.servidores,
    (servidor) => servidor.bancoHorasSaldo?.creditosValidadosMinutos,
  );
  const totalDebito = somar(
    painel.servidores,
    (servidor) => servidor.bancoHorasSaldo?.debitosValidadosMinutos,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Banco de horas", href: "/banco-horas" },
          { label: "Painel da chefia" },
        ]}
      />

      <PageHeader
        icon={UsersRound}
        titulo="Painel da chefia"
        descricao="Acompanhe saldos, pedidos, vencimentos e ocorrências da equipe antes da homologação mensal."
        artigo="Banco de horas"
        regraTitulo="Gestão da unidade"
        regraDescricao="A chefia deve autorizar, acompanhar limites, organizar compensações e validar os resultados na homologação mensal."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Equipe acompanhada"
          valor={String(painel.servidores.length)}
          detalhe="Servidores ativos nas unidades subordinadas."
          icon={UsersRound}
        />
        <Indicador
          titulo="Com saldo positivo"
          valor={String(servidoresComCredito)}
          detalhe={`Crédito validado: ${minutosParaHoraBanco(totalCredito)}.`}
          icon={TrendingUp}
        />
        <Indicador
          titulo="Com saldo negativo"
          valor={String(servidoresComDebito)}
          detalhe={`Débito validado: ${minutosParaHoraBanco(totalDebito)}.`}
          icon={TrendingDown}
        />
        <Indicador
          titulo="Pedidos pendentes"
          valor={String(painel.solicitacoesPendentes.length)}
          detalhe="Solicitacoes aguardando decisao da chefia."
          icon={ClipboardList}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border bg-[var(--card)] shadow-sm">
            <div className="border-b p-5">
              <h2 className="text-lg font-bold">Solicitações aguardando análise</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Priorize pedidos com impacto em prazo, limite mensal ou continuidade do serviço.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3">Servidor</th>
                    <th className="px-5 py-3">Unidade</th>
                    <th className="px-5 py-3">Pedido</th>
                    <th className="px-5 py-3">Criado em</th>
                    <th className="px-5 py-3">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {painel.solicitacoesPendentes.map((solicitacao) => (
                    <tr key={solicitacao.id} className="border-b last:border-0">
                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {nomeServidor(solicitacao.servidor)}
                        </div>
                        <div className="font-mono text-xs text-[var(--muted-foreground)]">
                          {solicitacao.servidor.matricula}
                        </div>
                      </td>
                      <td className="px-5 py-4">{unidadeServidor(solicitacao.servidor)}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold">{solicitacao.titulo}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {rotuloSolicitacao(solicitacao.tipo)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {new Intl.DateTimeFormat("pt-BR").format(solicitacao.criadoEm)}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/solicitacoes/${solicitacao.id}`}
                          className="font-semibold text-[var(--secp-theme-accent)] underline-offset-4 hover:underline"
                        >
                          Analisar
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {painel.solicitacoesPendentes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                      >
                        Nenhuma solicitação de banco de horas aguardando análise.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-[var(--card)] shadow-sm">
            <div className="border-b p-5">
              <h2 className="text-lg font-bold">Equipe por saldo</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3">Servidor</th>
                    <th className="px-5 py-3">Unidade</th>
                    <th className="px-5 py-3">Credito</th>
                    <th className="px-5 py-3">Debito</th>
                    <th className="px-5 py-3">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {painel.servidores.map((servidor) => (
                    <tr key={servidor.id} className="border-b last:border-0">
                      <td className="px-5 py-4">
                        <div className="font-semibold">{nomeServidor(servidor)}</div>
                        <div className="font-mono text-xs text-[var(--muted-foreground)]">
                          {servidor.matricula}
                        </div>
                      </td>
                      <td className="px-5 py-4">{unidadeServidor(servidor)}</td>
                      <td className="px-5 py-4 font-mono">
                        {minutosParaHoraBanco(
                          servidor.bancoHorasSaldo?.creditosValidadosMinutos ?? 0,
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {minutosParaHoraBanco(
                          servidor.bancoHorasSaldo?.debitosValidadosMinutos ?? 0,
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold">
                        {minutosParaHoraBanco(
                          servidor.bancoHorasSaldo?.saldoMinutos ?? 0,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Hourglass className="mt-0.5 size-5 text-[var(--muted-foreground)]" />
              <div>
                <h2 className="font-bold">Vencimentos próximos</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Créditos e débitos que vencem em até 30 dias ou já venceram.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {painel.vencimentos.slice(0, 8).map((movimento) => (
                <Link
                  key={movimento.id}
                  href={`/banco-horas?servidorId=${movimento.servidorId}&competencia=${movimento.anoReferencia}-${String(
                    movimento.mesReferencia,
                  ).padStart(2, "0")}`}
                  className="block rounded-lg border p-3 transition hover:bg-[var(--muted)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {nomeServidor(movimento.servidor)}
                    </p>
                    <span className="rounded-full bg-[var(--muted)] px-2 py-1 text-xs font-semibold">
                      {prazoStatus(movimento.expiraEm)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {movimento.tipo} - {minutosParaHoraBanco(movimento.minutos)}
                    {" - "}
                    {movimento.expiraEm
                      ? new Intl.DateTimeFormat("pt-BR").format(movimento.expiraEm)
                      : "sem prazo"}
                  </p>
                </Link>
              ))}
              {painel.vencimentos.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhum vencimento critico no momento.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
              <div>
                  <h2 className="font-bold">Pendências de classificação</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Horas não autorizadas ou acima do limite devem ser analisadas antes da homologação.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {painel.movimentosSemAutorizacao.slice(0, 8).map((movimento) => (
                <div key={movimento.id} className="rounded-lg border p-3">
                  <p className="text-sm font-semibold">
                    {nomeServidor(movimento.servidor)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {new Intl.DateTimeFormat("pt-BR").format(movimento.dataReferencia)}
                    {" - "}
                    {rotuloTipoMovimentoBancoHoras(movimento.tipo)}
                    {" - "}
                    {minutosParaHoraBanco(movimento.minutos)}
                  </p>
                  {movimento.tipo === "HORAS_ACIMA_LIMITE" ? (
                    <form
                      action={tratarPendenciaBancoHorasAction}
                      className="mt-3 space-y-2"
                    >
                      <input type="hidden" name="movimentoId" value={movimento.id} />
                      <input type="hidden" name="acao" value="REFERENDAR_LIMITE" />
                      <input
                        name="processoSei"
                        className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-xs"
                        placeholder="Processo SEI"
                        required
                      />
                      <textarea
                        name="justificativa"
                        rows={2}
                        className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-xs"
                        placeholder="Justificativa pormenorizada"
                        required
                      />
                      <button
                        type="submit"
                        className="secp-theme-action rounded-md border px-3 py-1.5 text-xs font-semibold"
                      >
                        Registrar referendo
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
              {painel.movimentosSemAutorizacao.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhuma pendência de classificação encontrada.
                </p>
              ) : null}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
