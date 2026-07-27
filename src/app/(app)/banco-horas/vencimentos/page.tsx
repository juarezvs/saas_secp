import Link from "next/link";
import { CalendarClock, Eye } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import {
  classeClassificacaoPrazoBancoHoras,
  classificarPrazoBancoHoras,
  rotuloClassificacaoPrazoBancoHoras,
} from "@/modules/banco-horas/application/services/classificar-prazo-banco-horas.service";
import { tratarPendenciaBancoHorasAction } from "@/modules/banco-horas/application/actions/tratar-pendencia-banco-horas.action";
import {
  formatarDataCivilBancoHoras,
  minutosParaHoraBanco,
  rotuloTipoMovimentoBancoHoras,
} from "@/modules/banco-horas/application/services/formatar-banco-horas.service";
import {
  buscarServidorBancoHorasPorUsuarioId,
  listarVencimentosBancoHoras,
} from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

type BancoHorasVencimentosPageProps = {
  searchParams: Promise<{
    filtro?: string;
  }>;
};

function rotuloPrazo(data: Date | null) {
  return rotuloClassificacaoPrazoBancoHoras(
    classificarPrazoBancoHoras({ prazo: data }),
  );
}

function classePrazo(data: Date | null) {
  return classeClassificacaoPrazoBancoHoras(
    classificarPrazoBancoHoras({ prazo: data }),
  );
}

function ProvidenciaVencimento({
  movimentoId,
  tipo,
  podeTratarPendencia,
  podeRegistrarDefesa,
}: {
  movimentoId: string;
  tipo: string;
  podeTratarPendencia: boolean;
  podeRegistrarDefesa: boolean;
}) {
  if (tipo !== "DEBITO") {
    return <span className="text-xs text-[var(--muted-foreground)]">-</span>;
  }

  if (podeRegistrarDefesa) {
    return (
      <form action={tratarPendenciaBancoHorasAction} className="space-y-2">
        <input type="hidden" name="movimentoId" value={movimentoId} />
        <input type="hidden" name="acao" value="REGISTRAR_DEFESA" />
        <textarea
          name="justificativa"
          rows={2}
          className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-xs"
          placeholder="Apresente sua justificativa"
          required
        />
        <button
          type="submit"
          className="secp-theme-action rounded-md border px-3 py-1.5 text-xs font-semibold"
        >
          Registrar defesa
        </button>
      </form>
    );
  }

  if (!podeTratarPendencia) {
    return <span className="text-xs text-[var(--muted-foreground)]">-</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        action={tratarPendenciaBancoHorasAction}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="movimentoId" value={movimentoId} />
        <input type="hidden" name="acao" value="NOTIFICAR_DEBITO" />
        <input
          name="justificativa"
          className="rounded-md border bg-[var(--background)] px-3 py-2 text-xs"
          placeholder="Justificativa da notificação"
        />
        <button
          type="submit"
          className="secp-theme-action rounded-md border px-3 py-1.5 text-xs font-semibold"
        >
          Notificar
        </button>
      </form>
      <form
        action={tratarPendenciaBancoHorasAction}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="movimentoId" value={movimentoId} />
        <input type="hidden" name="acao" value="ENCAMINHAR_FOLHA" />
        <input
          name="processoSei"
          className="rounded-md border bg-[var(--background)] px-3 py-2 text-xs"
          placeholder="Processo SEI"
        />
        <button
          type="submit"
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
        >
          Encaminhar à folha
        </button>
      </form>
    </div>
  );
}

export default async function BancoHorasVencimentosPage({
  searchParams,
}: BancoHorasVencimentosPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "banco-horas:consultar:proprio",
    "banco-horas:consultar:chefia",
    "banco-horas:consultar:global",
  ]);
  const params = await searchParams;
  const apenasVencidos = params.filtro === "vencidos";
  const podeGlobal =
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "banco-horas:consultar:global",
    ) && permissao.perfilAtivoCodigo?.toUpperCase() !== "CHEFIA";
  const podeChefia =
    permissao.perfilAtivoCodigo?.toUpperCase() === "CHEFIA" ||
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "banco-horas:consultar:chefia",
    );
  const escopo = await obterEscopoOrgaoDaSessao();
  let servidorIds: string[] | undefined;
  let orgaoIdsPermitidos: string[] | undefined;

  if (podeGlobal) {
    orgaoIdsPermitidos = escopo.global ? undefined : escopo.orgaoIds;
  } else if (podeChefia && permissao.usuarioId) {
    const unidades = await listarIdsUnidadesSubordinadasPorUsuario(
      permissao.usuarioId,
    );
    const servidores =
      unidades.length > 0
        ? await prisma.servidor.findMany({
            where: {
              ativo: true,
              usuarioId: {
                not: permissao.usuarioId,
              },
              lotacoes: {
                some: {
                  status: "ATIVO",
                  unidadeId: {
                    in: unidades,
                  },
                },
              },
            },
            select: {
              id: true,
            },
          })
        : [];
    servidorIds = servidores.map((servidor) => servidor.id);
  } else if (permissao.usuarioId) {
    const hoje = new Date();
    const servidor = await buscarServidorBancoHorasPorUsuarioId(
      permissao.usuarioId,
      {
        anoReferencia: hoje.getFullYear(),
        mesReferencia: hoje.getMonth() + 1,
      },
    );
    servidorIds = servidor ? [servidor.id] : [];
  }

  const vencimentos = await listarVencimentosBancoHoras({
    servidorIds,
    orgaoIdsPermitidos,
    apenasVencidos,
    limite: 200,
  });
  const podeTratarPendencia = podeGlobal || podeChefia;
  const podeRegistrarDefesa = !podeTratarPendencia;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Banco de horas", href: "/banco-horas" },
          { label: "Vencimentos" },
        ]}
      />

      <PageHeader
        icon={CalendarClock}
        titulo="Vencimentos do banco de horas"
        descricao="Acompanhe créditos e débitos com prazo de compensação, priorizando o que está vencido ou vencendo nos próximos 30 dias."
        artigo="Banco de horas"
        regraTitulo="Prazo de três meses"
        regraDescricao="Créditos e débitos devem ser compensados em até três meses após o mês de origem, com alertas antes do vencimento."
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Agenda de prazos</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {vencimentos.length} movimento
              {vencimentos.length === 1 ? "" : "s"} encontrado
              {vencimentos.length === 1 ? "" : "s"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/banco-horas/vencimentos"
              className="secp-theme-action rounded-md border px-3 py-2 text-sm font-semibold"
            >
              Próximos 30 dias
            </Link>
            <Link
              href="/banco-horas/vencimentos?filtro=vencidos"
              className="secp-theme-action rounded-md border px-3 py-2 text-sm font-semibold"
            >
              Apenas vencidos
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Servidor</th>
                <th className="px-5 py-3">Origem</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Horas</th>
                <th className="px-5 py-3">Prazo</th>
                <th className="px-5 py-3">Situação</th>
                <th className="px-5 py-3">Detalhe</th>
                <th className="px-5 py-3">Providência</th>
              </tr>
            </thead>
            <tbody>
              {vencimentos.map((movimento) => (
                <tr key={movimento.id} className="border-b last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {nomeServidor(movimento.servidor)}
                    </div>
                    <div className="font-mono text-xs text-[var(--muted-foreground)]">
                      {movimento.servidor.matricula} -{" "}
                      {movimento.servidor.orgao.sigla}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {String(movimento.mesReferencia).padStart(2, "0")}/
                    {movimento.anoReferencia}
                  </td>
                  <td className="px-5 py-4">
                    {rotuloTipoMovimentoBancoHoras(movimento.tipo)}
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold">
                    {minutosParaHoraBanco(movimento.minutos)}
                  </td>
                  <td className="px-5 py-4">
                    {movimento.expiraEm
                      ? formatarDataCivilBancoHoras(movimento.expiraEm)
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={[
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        classePrazo(movimento.expiraEm),
                      ].join(" ")}
                    >
                      {rotuloPrazo(movimento.expiraEm)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/banco-horas?servidorId=${movimento.servidorId}&competencia=${movimento.anoReferencia}-${String(
                        movimento.mesReferencia,
                      ).padStart(2, "0")}`}
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-[var(--secp-theme-accent)] transition hover:bg-[var(--muted)]"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Abrir extrato
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <ProvidenciaVencimento
                      movimentoId={movimento.id}
                      tipo={movimento.tipo}
                      podeTratarPendencia={podeTratarPendencia}
                      podeRegistrarDefesa={podeRegistrarDefesa}
                    />
                  </td>
                </tr>
              ))}

              {vencimentos.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum vencimento encontrado para o filtro selecionado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
