import { notFound } from "next/navigation";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { resolverEscopoServidoresRecesso } from "@/modules/recesso-forense/application/services/escopo-recesso-forense.service";
import { buscarRecessoForensePorId } from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";
import { RecessoDetalhe } from "@/modules/recesso-forense/presentation/components/recesso-detalhe";

type RecessoDetalhePageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecessoDetalhePage({
  params,
}: RecessoDetalhePageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:consultar:proprio",
    "recesso:consultar:global",
    "recesso:gerenciar:global",
    "recesso:homologar:chefia",
    "recesso:aceitar:seccional",
  ]);

  const { id } = await params;
  const escopoRecesso = await resolverEscopoServidoresRecesso(permissao);
  const recesso = await buscarRecessoForensePorId(id, {
    servidorIdsPermitidos: escopoRecesso.servidorIdsPermitidos,
  });

  if (!recesso) {
    notFound();
  }

  return (
    <RecessoDetalhe
      recesso={recesso}
      visualizacaoRestrita={escopoRecesso.restrito}
      visualizacaoServidor={escopoRecesso.perfilServidor}
      visualizacaoChefia={escopoRecesso.perfilChefiaAtivo}
    />
  );
}
