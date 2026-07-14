import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atribuirJornadaServidorAction } from "@/modules/jornadas/application/actions/atribuir-jornada-servidor.action";
import {
  listarJornadasAtivas,
  listarServidoresAtivosParaJornada,
} from "@/modules/jornadas/infrastructure/repositories/jornada.repository";
import { JornadaServidorForm } from "@/modules/jornadas/presentation/components/jornada-servidor-form";

export default async function AtribuicoesJornadaPage() {
  await exigirPermissaoOuRedirecionar("jornadas:gerenciar:global");

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;
  const [jornadasAtivas, servidores] = await Promise.all([
    listarJornadasAtivas(),
    listarServidoresAtivosParaJornada({ orgaoIdsPermitidos }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Jornadas", href: "/jornadas" },
          { label: "Atribuicoes" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <PageHeader
          icon={CalendarClock}
          titulo="Atribuir jornada ao servidor"
          descricao="Defina a jornada vigente para apuracao diaria, carga mensal, banco de horas e homologacao."
          artigo="Arts. 4, 8 e 18"
          regraTitulo="Jornada individual"
          regraDescricao="Cada servidor deve possuir jornada vigente compativel com seu cargo, lotacao e eventuais autorizacoes administrativas."
        />

        <Link
          href="/jornadas"
          className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar
        </Link>
      </section>

      <JornadaServidorForm
        action={atribuirJornadaServidorAction}
        servidores={servidores}
        jornadas={jornadasAtivas}
      />
    </div>
  );
}
