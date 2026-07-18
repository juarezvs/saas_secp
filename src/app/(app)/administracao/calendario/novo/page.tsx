import { CalendarPlus } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarCalendarioInstitucionalAction } from "@/modules/calendario-institucional/application/actions/criar-calendario-institucional.action";
import { CalendarioInstitucionalForm } from "@/modules/calendario-institucional/presentation/components/calendario-institucional-form";
import {
  listarLocalidadesCalendarioParaSelecao,
  listarOrgaosAtivos,
} from "@/modules/unidades/infrastructure/repositories/unidade.repository";

export default async function NovoCalendarioInstitucionalPage() {
  await exigirPermissaoOuRedirecionar("configuracoes:gerenciar:global");
  const [orgaos, unidades] = await Promise.all([
    listarOrgaosAtivos(),
    listarLocalidadesCalendarioParaSelecao(),
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
        modo="criar"
      />
    </div>
  );
}
