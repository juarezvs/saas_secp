import { FilePlus2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { listarServidoresParaFiltro } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { listarUnidadesParaSelecao } from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { HorasExtrasAutorizacaoSecapForm } from "@/modules/horas-extras/presentation/components/horas-extras-autorizacao-secap-form";

export default async function NovaAutorizacaoHorasExtrasSecapPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "horas-extras:cadastrar-autorizacao:seccional",
    "horas-extras:cadastrar-autorizacao:global",
  ]);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;
  const [orgaos, unidades, servidores] = await Promise.all([
    listarOrgaosAtivos({ orgaoIdsPermitidos }),
    listarUnidadesParaSelecao({ orgaoIdsPermitidos }),
    listarServidoresParaFiltro({ orgaoIdsPermitidos, limite: 1000 }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          {
            label: "Autorizações de horas-extras",
            href: "/horas-extras/autorizacoes",
          },
          { label: "Nova" },
        ]}
      />

      <PageHeader
        icon={FilePlus2}
        titulo="Nova autorização de horas-extras"
        descricao="Registro administrativo formalizado para execução, conferência, atesto e folha."
      />

      <HorasExtrasAutorizacaoSecapForm
        orgaos={orgaos}
        unidades={unidades}
        servidores={servidores}
      />
    </div>
  );
}
