import { FileSpreadsheet, FileText } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { buscarServidorBancoHorasPorUsuarioId } from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";
import { RelatorioExportacaoButton } from "@/modules/relatorios/presentation/components/relatorio-exportacao-button";

type BancoHorasRelatoriosPageProps = {
  searchParams: Promise<{
    competencia?: string;
  }>;
};

function competenciaAtual(competenciaParam?: string) {
  const hoje = new Date();
  const match = competenciaParam?.match(/^(\d{4})-(\d{2})$/);
  const ano = Number(match?.[1] ?? hoje.getFullYear());
  const mes = Number(match?.[2] ?? hoje.getMonth() + 1);

  return {
    ano,
    mes,
    input: `${ano}-${String(mes).padStart(2, "0")}`,
  };
}

function CardRelatorio({
  titulo,
  descricao,
  href,
  icon: Icon,
  modo = "assincrono",
  label = "Gerar relatório",
}: {
  titulo: string;
  descricao: string;
  href: string;
  icon: typeof FileText;
  modo?: "assincrono" | "auto";
  label?: string;
}) {
  return (
    <article className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="secp-theme-icon rounded-lg p-3">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold">{titulo}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {descricao}
          </p>
        </div>
      </div>
      <RelatorioExportacaoButton
        href={href}
        modo={modo}
        className="secp-theme-action mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition"
      >
        {label}
      </RelatorioExportacaoButton>
    </article>
  );
}

export default async function BancoHorasRelatoriosPage({
  searchParams,
}: BancoHorasRelatoriosPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "relatorios:consultar:proprio",
    "relatorios:consultar:global",
    "relatorios-gerenciais:consultar:chefia",
    "relatorios-gerenciais:consultar:global",
  ]);
  const params = await searchParams;
  const competencia = competenciaAtual(params.competencia);
  const podeGerencial =
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "relatorios-gerenciais:consultar:chefia",
    ) ||
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "relatorios-gerenciais:consultar:global",
    );
  const servidor = permissao.usuarioId
    ? await buscarServidorBancoHorasPorUsuarioId(permissao.usuarioId, {
        anoReferencia: competencia.ano,
        mesReferencia: competencia.mes,
      })
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Banco de horas", href: "/banco-horas" },
          { label: "Relatórios" },
        ]}
      />

      <PageHeader
        icon={FileText}
        titulo="Relatórios de banco de horas"
        descricao="Gere demonstrativos individuais e relatórios gerenciais para acompanhamento de saldos, vencimentos, limites e pendências."
        artigo="Banco de horas"
        regraTitulo="Rastreabilidade"
        regraDescricao="O saldo exibido deve ser consequência dos movimentos e das autorizações registradas, sem edição direta do resultado."
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[220px_auto] md:items-end">
          <label className="text-sm font-semibold">
            Competência
            <input
              type="month"
              name="competencia"
              defaultValue={competencia.input}
              className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="secp-theme-action h-10 rounded-md border px-4 text-sm font-semibold"
          >
            Atualizar competência
          </button>
        </form>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {servidor ? (
          <CardRelatorio
            titulo="Demonstrativo individual"
            descricao="PDF com saldo, créditos, débitos, autorizações e movimentos do servidor autenticado."
            href={`/api/relatorios/banco-horas/${servidor.id}/pdf?ano=${competencia.ano}&mes=${competencia.mes}`}
            icon={FileText}
          />
        ) : null}

        {podeGerencial ? (
          <CardRelatorio
            titulo="Relatório gerencial"
            descricao="PDF consolidado para chefia ou gestão com horas extras, banco de horas e indicadores de frequência."
            href={`/api/relatorios/gerenciais/horas-extras-banco-horas/pdf?ano=${competencia.ano}&mes=${competencia.mes}`}
            icon={FileSpreadsheet}
          />
        ) : null}

        {podeGerencial ? (
          <CardRelatorio
            titulo="CSV de gestão"
            descricao="Planilha simples de apoio com servidores, saldos iniciais e saldo atual do banco de horas."
            href="/api/administracao/banco-horas/exportar"
            icon={FileSpreadsheet}
            modo="auto"
            label="Baixar CSV"
          />
        ) : null}
      </section>
    </div>
  );
}
