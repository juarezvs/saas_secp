import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { garantirProcedimentosPadraoFrequenciaOrgao } from "@/modules/procedimentos-frequencia/application/services/procedimentos-frequencia.service";
import { ProcedimentosFrequenciaForm } from "@/modules/procedimentos-frequencia/presentation/components/procedimentos-frequencia-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

type ProcedimentosFrequenciaOrgaoPageProps = {
  params: Promise<{
    orgaoId: string;
  }>;
};

export default async function ProcedimentosFrequenciaOrgaoPage({
  params,
}: ProcedimentosFrequenciaOrgaoPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "procedimentos-frequencia:consultar:seccional",
    "procedimentos-frequencia:gerenciar:seccional",
    "procedimentos-frequencia:consultar:global",
    "procedimentos-frequencia:gerenciar:global",
  ]);

  const { orgaoId } = await params;
  const escopoOrgao = await obterEscopoOrgaoDaSessao();

  if (!escopoOrgao.global && !escopoOrgao.orgaoIds.includes(orgaoId)) {
    notFound();
  }

  await garantirProcedimentosPadraoFrequenciaOrgao(orgaoId);

  const orgao = await prisma.orgao.findUnique({
    where: { id: orgaoId },
    include: {
      procedimentosFrequencia: {
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
      _count: {
        select: {
          procedimentosFrequenciaExecucoes: true,
        },
      },
    },
  });

  if (!orgao) {
    notFound();
  }

  const ativos = orgao.procedimentosFrequencia.filter(
    (procedimento) => procedimento.ativo,
  ).length;
  const bancoFechado = orgao.procedimentosFrequencia.filter(
    (procedimento) => procedimento.permiteBancoFechado,
  ).length;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          {
            label: "Procedimentos de frequência",
            href: "/administracao/procedimentos-frequencia",
          },
          { label: orgao.sigla },
        ]}
      />

      <PageHeader
        icon={ClipboardList}
        titulo={`Procedimentos de frequência - ${orgao.sigla}`}
        descricao="Defina como esta seccional trata ajustes, exceções, conversões, jornadas especiais e declarações administrativas."
        regraTitulo="Sem regra hardcode"
        regraDescricao="O SECP usa estes parâmetros para orientar permissões, checklist, recálculo, banco fechado e preservação do histórico."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Procedimentos ativos
          </p>
          <p className="mt-2 text-3xl font-black">
            {ativos}/{orgao.procedimentosFrequencia.length}
          </p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Permitem banco fechado
          </p>
          <p className="mt-2 text-3xl font-black">{bancoFechado}</p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Execuções registradas
          </p>
          <p className="mt-2 text-3xl font-black">
            {orgao._count.procedimentosFrequenciaExecucoes}
          </p>
        </div>
      </section>

      <ProcedimentosFrequenciaForm
        orgao={orgao}
        procedimentos={orgao.procedimentosFrequencia}
      />
    </div>
  );
}

