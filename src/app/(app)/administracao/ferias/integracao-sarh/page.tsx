import { DatabaseZap } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarProgramacoesPendentesEnvioSarh } from "@/modules/programacao-ferias/infrastructure/repositories/programacao-ferias.repository";
import {
  IntegracaoSarhFeriasTable,
  MensagemFerias,
} from "@/modules/programacao-ferias/presentation/components/programacao-ferias-ui";

type PageProps = {
  searchParams?: Promise<{ ok?: string; erro?: string }>;
};

export default async function IntegracaoSarhFeriasPage({
  searchParams,
}: PageProps) {
  const [permissao, query] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar([
      "programacao-ferias:executar-sarh:seccional",
      "programacao-ferias:executar-sarh:global",
    ]),
    searchParams,
  ]);
  const podeGlobal = permissao.permissoes.includes(
    "programacao-ferias:executar-sarh:global",
  );
  const programacoes = await listarProgramacoesPendentesEnvioSarh(
    podeGlobal ? undefined : permissao.orgaoIds,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Início", href: "/dashboard" },
          { label: "Administração", href: "/administracao" },
          { label: "Férias SARH" },
        ]}
      />

      <PageHeader
        icon={DatabaseZap}
        titulo="Integração de férias SARH"
        descricao="Execute o envio controlado das programações aprovadas e confirme o retorno após sincronizar o SARH."
      />

      <MensagemFerias ok={query?.ok} erro={query?.erro} />

      <IntegracaoSarhFeriasTable programacoes={programacoes} />
    </div>
  );
}
