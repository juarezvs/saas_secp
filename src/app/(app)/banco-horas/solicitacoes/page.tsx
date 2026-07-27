import Link from "next/link";
import { CalendarClock, Eye, Send } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarSolicitacaoBancoHorasAction } from "@/modules/banco-horas/application/actions/criar-solicitacao-banco-horas.action";
import { minutosParaHoraBanco } from "@/modules/banco-horas/application/services/formatar-banco-horas.service";
import {
  buscarServidorBancoHorasPorUsuarioId,
  listarSolicitacoesBancoHorasServidor,
} from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";

type BancoHorasSolicitacoesPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function rotuloTipo(tipo: string) {
  const rotulos: Record<string, string> = {
    HORA_CREDITO_PREVIA: "Gerar credito",
    FOLGA_BANCO_HORAS: "Utilizar saldo",
    COMPENSACAO: "Compensar debito",
  };

  return rotulos[tipo] ?? tipo;
}

function rotuloStatus(status: string) {
  const rotulos: Record<string, string> = {
    RASCUNHO: "Rascunho",
    ENVIADA: "Enviada",
    EM_ANALISE: "Em analise",
    DEFERIDA: "Deferida",
    INDEFERIDA: "Indeferida",
    CANCELADA: "Cancelada",
  };

  return rotulos[status] ?? status;
}

function extrairMinutos(dados: unknown) {
  if (!dados || typeof dados !== "object") {
    return null;
  }

  const valor = (dados as { minutosSolicitados?: unknown }).minutosSolicitados;

  return typeof valor === "number" ? valor : null;
}

export default async function BancoHorasSolicitacoesPage({
  searchParams,
}: BancoHorasSolicitacoesPageProps) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "solicitacoes:criar:proprio",
  );
  const params = await searchParams;
  const hoje = new Date();
  const servidor = permissao.usuarioId
    ? await buscarServidorBancoHorasPorUsuarioId(permissao.usuarioId, {
        anoReferencia: hoje.getFullYear(),
        mesReferencia: hoje.getMonth() + 1,
      })
    : null;
  const solicitacoes = servidor
    ? await listarSolicitacoesBancoHorasServidor({
        servidorId: servidor.id,
      })
    : [];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Banco de horas", href: "/banco-horas" },
          { label: "Solicitacoes" },
        ]}
      />

      <PageHeader
        icon={CalendarClock}
        titulo="Solicitacoes de banco de horas"
        descricao="Solicite autorizacao para gerar credito, utilizar saldo ou compensar debito. O saldo so e alterado apos aprovacao e ocorrencia da compensacao."
        artigo="Banco de horas"
        regraTitulo="Autorizacao previa"
        regraDescricao="A existencia de saldo positivo nao autoriza atraso, saida antecipada ou folga sem anuencia da chefia."
      />

      {params.erro ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {params.erro}
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
        <form
          action={criarSolicitacaoBancoHorasAction}
          className="rounded-xl border bg-[var(--card)] p-5 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold">Nova solicitacao</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
              Informe a finalidade, periodo e quantidade. A chefia podera
              aprovar integralmente, aprovar parcialmente ou indeferir.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">
              Modalidade
              <select
                name="modalidade"
                required
                className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
                defaultValue="GERAR_CREDITO"
              >
                <option value="GERAR_CREDITO">
                  Gerar credito previamente autorizado
                </option>
                <option value="UTILIZAR_SALDO">
                  Utilizar saldo disponivel
                </option>
                <option value="COMPENSAR_DEBITO">
                  Compensar debito pendente
                </option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Data inicial
                <input
                  type="date"
                  name="dataInicio"
                  required
                  defaultValue={hojeIso()}
                  className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
                />
              </label>

              <label className="block text-sm font-semibold">
                Data final
                <input
                  type="date"
                  name="dataFim"
                  required
                  defaultValue={hojeIso()}
                  className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold">
              Quantidade de horas
              <input
                type="number"
                name="horasSolicitadas"
                min="0.25"
                max="16"
                step="0.25"
                required
                placeholder="Ex.: 1.5"
                className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
              />
            </label>

            <label className="block text-sm font-semibold">
              Titulo
              <input
                name="titulo"
                required
                minLength={5}
                maxLength={180}
                placeholder="Ex.: Compensacao de debito de julho"
                className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
              />
            </label>

            <label className="block text-sm font-semibold">
              Justificativa
              <textarea
                name="justificativa"
                required
                minLength={10}
                maxLength={3000}
                rows={5}
                className="mt-1 w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              className="secp-theme-primary-action inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition"
            >
              <Send className="size-4" aria-hidden="true" />
              Enviar para chefia
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-xl border bg-[var(--card)] shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">Minhas solicitacoes recentes</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Acompanhe pedidos enviados e decisoes da chefia.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Pedido</th>
                  <th className="px-5 py-3">Periodo</th>
                  <th className="px-5 py-3">Horas</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoes.map((solicitacao) => (
                  <tr key={solicitacao.id} className="border-b last:border-0">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{solicitacao.titulo}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {rotuloTipo(solicitacao.tipo)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {solicitacao.dataInicio
                        ? new Intl.DateTimeFormat("pt-BR").format(
                            solicitacao.dataInicio,
                          )
                        : "-"}
                      {" a "}
                      {solicitacao.dataFim
                        ? new Intl.DateTimeFormat("pt-BR").format(
                            solicitacao.dataFim,
                          )
                        : "-"}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {extrairMinutos(solicitacao.dadosSolicitados) === null
                        ? "-"
                        : minutosParaHoraBanco(
                            extrairMinutos(solicitacao.dadosSolicitados) ?? 0,
                          )}
                    </td>
                    <td className="px-5 py-4">
                      {rotuloStatus(solicitacao.status)}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/solicitacoes/${solicitacao.id}`}
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-[var(--secp-theme-accent)] transition hover:bg-[var(--muted)]"
                      >
                        <Eye className="size-4" aria-hidden="true" />
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}

                {solicitacoes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                    >
                      Nenhuma solicitacao de banco de horas foi registrada.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
