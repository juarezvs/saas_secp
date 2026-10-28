import { Radar } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { discoveryContext } from "@/modules/descoberta/application/gateway";
import { DiscoveryConsole } from "@/modules/descoberta/presentation/discovery-console";

export default async function DescobertaEquipamentosPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; orgaoId?: string }>;
}) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:gerenciar:global",
    "integracoes:consultar:global",
    "integracoes:gerenciar:seccional",
    "integracoes:consultar:seccional",
  ]);
  const context = await discoveryContext();
  const params = await searchParams;
  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: "Equipamentos biométricos", href: "/equipamentos" },
          { label: "Descoberta de equipamentos" },
        ]}
      />
      <PageHeader
        icon={Radar}
        titulo="Descoberta de equipamentos"
        variant="blade"
        descricao="Localize e identifique relógios de ponto, catracas e controladores conectados às redes das unidades."
      />
      <DiscoveryConsole
        orgaos={context.orgaos}
        canManage={context.manage}
        initialOrg={params?.orgaoId}
        initialTab={params?.tab}
      />
    </div>
  );
}
