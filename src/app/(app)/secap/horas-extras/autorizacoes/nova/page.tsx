import { FilePlus2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { listarServidoresParaFiltro } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { listarUnidadesParaSelecao } from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { HorasExtrasAutorizacaoSecapForm } from "@/modules/horas-extras/presentation/components/horas-extras-autorizacao-secap-form";

export default async function NovaAutorizacaoHorasExtrasSecapPage() {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "horas-extras:cadastrar-autorizacao:seccional",
    "horas-extras:cadastrar-autorizacao:global",
  ]);
  const orgaoIdsPermitidos = permissao.perfilAtivoEscopoGlobal
    ? undefined
    : permissao.orgaoIds;
  const [orgaos, unidades, servidores] = await Promise.all([
    listarOrgaosAtivos({ orgaoIdsPermitidos }),
    listarUnidadesParaSelecao({ orgaoIdsPermitidos }),
    listarServidoresParaFiltro({ orgaoIdsPermitidos, limite: 1000 }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "SECAP", href: "/dashboard" },
          {
            label: "Autorizações de horas extras",
            href: "/secap/horas-extras/autorizacoes",
          },
          { label: "Nova" },
        ]}
      />

      <PageHeader
        icon={FilePlus2}
        titulo="Nova autorização de horas extras"
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
