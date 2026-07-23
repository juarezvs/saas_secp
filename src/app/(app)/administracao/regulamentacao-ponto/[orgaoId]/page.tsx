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

function minutosParaHoraMinuto(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
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
            label: "Regulamentação do ponto",
            href: "/administracao/regulamentacao-ponto",
          },
          { label: orgao.sigla },
        ]}
      />

      <PageHeader
        icon={SlidersHorizontal}
        titulo={`Regulamentação do ponto - ${orgao.sigla}`}
        descricao="Configure limites de crédito, tolerâncias, autorização prévia e critérios de banco de horas aplicados somente a este órgão."
        artigo={
          regras.numeroPortaria || "Resolução Presi TRF1-SECGE 10119147/2020"
        }
        regraTitulo="Aplicação restrita ao órgão"
        regraDescricao="Ao salvar com recálculo, o sistema reprocessa espelho de ponto e banco de horas apenas dos servidores vinculados a este órgão."
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
            Total de servidores atualmente vinculados ao órgão.
          </p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Teto mensal de banco de horas
          </p>
          <p className="mt-2 text-3xl font-black">
            {minutosParaHoraMinuto(regras.limiteCreditoMensalMinutos)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Máximo de crédito acumulável por competência.
          </p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Validade do crédito autorizado
          </p>
          <p className="mt-2 text-3xl font-black">
            {regras.mesesExpiracaoCompensacao} meses
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Prazo para utilizar a compensação deferida.
          </p>
        </div>
      </section>

      <RegulamentacaoPontoForm orgao={orgao} regras={regras} />
    </div>
  );
}
