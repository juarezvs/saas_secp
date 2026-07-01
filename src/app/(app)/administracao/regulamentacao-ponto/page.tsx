import Link from "next/link";
import { Edit, SlidersHorizontal } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { obterEscopoOrgaoDaSessao, whereOrgaoPermitido } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { REGULAMENTACAO_PONTO_PADRAO } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

function minutosParaHoras(minutos: number) {
  return Number((minutos / 60).toFixed(2));
}

function montarHrefPagina() {
  return "/administracao/regulamentacao-ponto";
}

function statusRegulamentacao(
  regulamentacao: { ativo: boolean } | null,
) {
  if (!regulamentacao) {
    return {
      label: "Padrao",
      className:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    };
  }

  if (!regulamentacao.ativo) {
    return {
      label: "Inativa",
      className:
        "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    };
  }

  return {
    label: "Configurada",
    className:
      "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  };
}

export default async function RegulamentacaoPontoPage() {
  await exigirPermissaoOuRedirecionar(
    "regulamentacao-ponto:gerenciar:global",
  );

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaos = await prisma.orgao.findMany({
    where: {
      ativo: true,
      ...whereOrgaoPermitido(escopoOrgao),
    },
    include: {
      regulamentacaoPonto: true,
      _count: {
        select: {
          servidores: true,
        },
      },
    },
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
  });

  const configurados = orgaos.filter(
    (orgao) => orgao.regulamentacaoPonto?.ativo,
  ).length;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Regulamentacao do ponto" },
        ]}
      />

      <PageHeader
        icon={SlidersHorizontal}
        titulo="Configurador de regulamentacao do ponto"
        descricao="Consulte os orgaos e acesse a configuracao propria de cada regulamentacao."
        artigo="Portaria SJAM-DIREF 135/2025"
        regraTitulo="Regra por orgao"
        regraDescricao="Cada orgao mantem parametros proprios sem interferir nos calculos dos demais orgaos."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Órgãos com regra ativa
          </p>
          <p className="mt-2 text-3xl font-black">
            {configurados}/{orgaos.length}
          </p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Credito mensal padrao
          </p>
          <p className="mt-2 text-3xl font-black">
            {minutosParaHoras(
              REGULAMENTACAO_PONTO_PADRAO.limiteCreditoMensalMinutos,
            )}
            h
          </p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Expiracao padrao
          </p>
          <p className="mt-2 text-3xl font-black">
            {REGULAMENTACAO_PONTO_PADRAO.mesesExpiracaoCompensacao} meses
          </p>
        </div>
      </section>

      <DataTableShell
        title="Regulamentacao por orgao"
        description="Entre no orgao desejado para ajustar regras, ato normativo, tolerancias e recalculo da competencia."
        total={orgaos.length}
        pagina={1}
        totalPaginas={1}
        itensPorPagina={orgaos.length || 10}
        montarHrefPagina={montarHrefPagina}
        toolbar={null}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Listagem de regulamentacao do ponto por orgao.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Órgão</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Portaria/ato</th>
                <th className="px-5 py-3">Limite mensal</th>
                <th className="px-5 py-3">Expiracao</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {orgaos.map((orgao) => {
                const status = statusRegulamentacao(
                  orgao.regulamentacaoPonto,
                );
                const regras =
                  orgao.regulamentacaoPonto ?? REGULAMENTACAO_PONTO_PADRAO;

                return (
                  <tr key={orgao.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{orgao.sigla}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {orgao.nome}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {regras.numeroPortaria || "-"}
                    </td>
                    <td className="px-5 py-4">
                      {minutosParaHoras(regras.limiteCreditoMensalMinutos)}h
                    </td>
                    <td className="px-5 py-4">
                      {regras.mesesExpiracaoCompensacao} meses
                    </td>
                    <td className="px-5 py-4">{orgao._count.servidores}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/administracao/regulamentacao-ponto/${orgao.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                      >
                        <Edit className="size-4" aria-hidden="true" />
                        Ajustar
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {orgaos.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum orgao ativo encontrado para configuracao.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
