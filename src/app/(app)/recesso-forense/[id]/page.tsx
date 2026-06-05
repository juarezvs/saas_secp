import { notFound } from "next/navigation";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarRecessoForensePorId } from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";
import { RecessoDetalhe } from "@/modules/recesso-forense/presentation/components/recesso-detalhe";

type RecessoDetalhePageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecessoDetalhePage({
  params,
}: RecessoDetalhePageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:consultar:proprio",
    "recesso:consultar:global",
    "recesso:gerenciar:global",
    "recesso:homologar:chefia",
    "recesso:aceitar:secad",
  ]);

  const { id } = await params;
  const recesso = await buscarRecessoForensePorId(id);

  if (!recesso) {
    notFound();
  }

  return <RecessoDetalhe recesso={recesso} />;
}
