import { CalendarPlus } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarCalendarioInstitucionalAction } from "@/modules/calendario-institucional/application/actions/criar-calendario-institucional.action";
import { CalendarioInstitucionalForm } from "@/modules/calendario-institucional/presentation/components/calendario-institucional-form";
import {
  listarLocalidadesCalendarioParaSelecao,
  listarOrgaosAtivos,
} from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { listarEstadosComCidadesAtivas } from "@/modules/localidades/infrastructure/repositories/localidade.repository";

export default async function NovoCalendarioInstitucionalPage() {
  await exigirPermissaoOuRedirecionar("configuracoes:gerenciar:global");
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds.length
      ? escopoOrgao.orgaoIds
      : ["00000000-0000-4000-8000-000000000000"];
  const [orgaos, unidades, tipos, estados] = await Promise.all([
    listarOrgaosAtivos({ orgaoIdsPermitidos }),
    listarLocalidadesCalendarioParaSelecao({ orgaoIdsPermitidos }),
    prisma.tipoFeriadoSuspensao.findMany({
      where: { ativo: true },
      select: { codigo: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    listarEstadosComCidadesAtivas(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          {
            label: "Calendário institucional",
            href: "/administracao/calendario",
          },
          { label: "Novo evento" },
        ]}
      />

      <PageHeader
        icon={CalendarPlus}
        titulo="Novo evento institucional"
        descricao="Cadastre feriados, pontos facultativos, feriados forenses, feriados locais e suspensões de expediente que alteram a apuração do ponto."
        artigo="Calendário institucional"
        regraTitulo="Efeito no ponto"
        regraDescricao="Eventos sem apuração regular deixam o dia sem expediente ordinário; eventos que contam como dia útil preservam efeitos em prazos."
      />

      <CalendarioInstitucionalForm
        action={criarCalendarioInstitucionalAction}
        orgaos={orgaos}
        unidades={unidades}
        tipos={tipos}
        estados={estados}
        modo="criar"
      />
    </div>
  );
}
