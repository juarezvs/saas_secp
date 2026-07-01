import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { REGULAMENTACAO_PONTO_PADRAO } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";
import { RegulamentacaoPontoForm } from "@/modules/regulamentacao-ponto/presentation/components/regulamentacao-ponto-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

type RegulamentacaoPontoOrgaoPageProps = {
  params: Promise<{
    orgaoId: string;
  }>;
};

function minutosParaHoras(minutos: number) {
  return Number((minutos / 60).toFixed(2));
}

export default async function RegulamentacaoPontoOrgaoPage({
  params,
}: RegulamentacaoPontoOrgaoPageProps) {
  await exigirPermissaoOuRedirecionar(
    "regulamentacao-ponto:gerenciar:global",
  );

  const { orgaoId } = await params;
  const escopoOrgao = await obterEscopoOrgaoDaSessao();

  if (!escopoOrgao.global && !escopoOrgao.orgaoIds.includes(orgaoId)) {
    notFound();
  }

  const orgao = await prisma.orgao.findUnique({
    where: { id: orgaoId },
    include: {
      regulamentacaoPonto: true,
      _count: {
        select: {
          servidores: true,
        },
      },
    },
  });

  if (!orgao) {
    notFound();
  }

  const regras = orgao.regulamentacaoPonto ?? REGULAMENTACAO_PONTO_PADRAO;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          {
            label: "Regulamentacao do ponto",
            href: "/administracao/regulamentacao-ponto",
          },
          { label: orgao.sigla },
        ]}
      />

      <PageHeader
        icon={SlidersHorizontal}
        titulo={`Regulamentacao do ponto - ${orgao.sigla}`}
        descricao="Configure limites de credito, tolerancias, autorizacao previa e criterios de banco de horas aplicados somente a este orgao."
        artigo={regras.numeroPortaria || "Portaria SJAM-DIREF 135/2025"}
        regraTitulo="Aplicacao restrita ao orgao"
        regraDescricao="Ao salvar com recalculo, o sistema reprocessa espelho de ponto e banco de horas apenas dos servidores vinculados a este orgao."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Servidores que podem ser afetados
          </p>
          <p className="mt-2 text-3xl font-black">
            {orgao._count.servidores}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Total de servidores atualmente vinculados ao orgao.
          </p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Teto mensal de banco de horas
          </p>
          <p className="mt-2 text-3xl font-black">
            {minutosParaHoras(regras.limiteCreditoMensalMinutos)}h
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Maximo de credito acumulavel por competencia.
          </p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Validade do credito autorizado
          </p>
          <p className="mt-2 text-3xl font-black">
            {regras.mesesExpiracaoCompensacao} meses
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Prazo para utilizar a compensacao deferida.
          </p>
        </div>
      </section>

      <RegulamentacaoPontoForm orgao={orgao} regras={regras} />
    </div>
  );
}
