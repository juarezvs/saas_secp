import { Clock3 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarServidoresGestaoBancoHoras } from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";
import { GestaoBancoHorasListagem } from "@/modules/banco-horas/presentation/components/gestao-banco-horas-admin";

type AdministracaoBancoHorasPageProps = {
  searchParams: Promise<{
    busca?: string;
  }>;
};

export default async function AdministracaoBancoHorasPage({
  searchParams,
}: AdministracaoBancoHorasPageProps) {
  await exigirPermissaoOuRedirecionar("banco-horas:gerenciar:global");

  const [params, escopo] = await Promise.all([
    searchParams,
    obterEscopoOrgaoDaSessao(),
  ]);
  const servidores = await listarServidoresGestaoBancoHoras({
    busca: params.busca,
    orgaoIdsPermitidos: escopo.global ? undefined : escopo.orgaoIds,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Gerenciar banco de horas" },
        ]}
      />

      <PageHeader
        icon={Clock3}
        titulo="Gerenciar banco de horas"
        descricao="Defina a competência inicial de controle, registre saldos de implantação e acompanhe o saldo dos servidores da seccional."
        artigo="Banco de horas"
        regraTitulo="Controle por competência"
        regraDescricao="O saldo importado do controle paralelo é registrado como movimento auditável e o SECP passa a considerar o banco de horas a partir da competência definida."
      />

      <GestaoBancoHorasListagem servidores={servidores} busca={params.busca} />
    </div>
  );
}
