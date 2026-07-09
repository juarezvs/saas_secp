import { notFound } from "next/navigation";
import { Clock3 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarServidorGestaoBancoHoras,
  listarConsolidadoBancoHorasPorCompetencia,
  listarMovimentosTransferiveisBancoHoras,
} from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";
import { GestaoBancoHorasDetalhe } from "@/modules/banco-horas/presentation/components/gestao-banco-horas-admin";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type AdministracaoBancoHorasDetalhePageProps = {
  params: Promise<{
    servidorId: string;
  }>;
};

export default async function AdministracaoBancoHorasDetalhePage({
  params,
}: AdministracaoBancoHorasDetalhePageProps) {
  await exigirPermissaoOuRedirecionar("banco-horas:gerenciar:global");

  const [{ servidorId }, escopo] = await Promise.all([
    params,
    obterEscopoOrgaoDaSessao(),
  ]);
  const servidor = await buscarServidorGestaoBancoHoras({
    servidorId,
    orgaoIdsPermitidos: escopo.global ? undefined : escopo.orgaoIds,
  });

  if (!servidor) {
    notFound();
  }

  const [movimentosTransferiveis, consolidado] = await Promise.all([
    listarMovimentosTransferiveisBancoHoras({ servidorId }),
    listarConsolidadoBancoHorasPorCompetencia({ servidorId }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          {
            label: "Gerenciar banco de horas",
            href: "/administracao/banco-horas",
          },
          { label: nomeServidor(servidor) },
        ]}
      />

      <PageHeader
        icon={Clock3}
        titulo="Banco de horas do servidor"
        descricao="Ajuste parâmetros iniciais, consulte o consolidado por competência e registre transferências excepcionais."
        artigo="Banco de horas"
        regraTitulo="Decisão administrativa"
        regraDescricao="Transferências para meses futuros devem ser registradas com referência à decisão do diretor do foro e mantêm trilha de auditoria."
      />

      <GestaoBancoHorasDetalhe
        servidor={servidor}
        movimentosTransferiveis={movimentosTransferiveis}
        consolidado={consolidado}
      />
    </div>
  );
}
