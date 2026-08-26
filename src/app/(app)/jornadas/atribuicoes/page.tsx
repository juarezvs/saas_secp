import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { resolverEscopoGestaoUsuarios } from "@/modules/usuarios/application/services/escopo-gestao-usuarios.service";
import { atribuirJornadaServidorAction } from "@/modules/jornadas/application/actions/atribuir-jornada-servidor.action";
import {
  listarJornadasAtivas,
  listarServidoresAtivosParaJornada,
} from "@/modules/jornadas/infrastructure/repositories/jornada.repository";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { JornadaServidorForm } from "@/modules/jornadas/presentation/components/jornada-servidor-form";

export default async function AtribuicoesJornadaPage() {
  const permissao = await exigirPermissaoOuRedirecionar(
    "jornadas:gerenciar:global",
  );

  const escopoUsuarios = await resolverEscopoGestaoUsuarios(permissao);
  const orgaoIdsPermitidos = escopoUsuarios.permitirEscopoGlobal
    ? undefined
    : escopoUsuarios.orgaoIdsPermitidos;
  const [jornadasAtivas, servidores, orgaos] = await Promise.all([
    listarJornadasAtivas(),
    listarServidoresAtivosParaJornada({ orgaoIdsPermitidos }),
    listarOrgaosAtivos(
      escopoUsuarios.permitirEscopoGlobal
        ? {}
        : { orgaoIdsPermitidos: orgaoIdsPermitidos ?? [] },
    ),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horário de Trabalho", href: "/jornadas" },
          { label: "Associações" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <PageHeader
          icon={CalendarClock}
          titulo="Associar horário às pessoas"
          descricao="Defina o horário vigente para apuração diária, carga mensal, banco de horas e homologação."
          artigo="Arts. 4, 8 e 18"
          regraTitulo="Horário individual"
          regraDescricao="Cada pessoa deve possuir horário vigente compatível com seu cargo, lotação e eventuais autorizações administrativas."
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
        orgaos={orgaos}
      />
    </div>
  );
}
