import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { HomologacaoMensalPage } from "@/modules/homologacao/presentation/components/homologacao-mensal-page";

export default async function HomologacaoDetalhePage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "homologacao:gerenciar:chefia",
    "homologacao:consultar:global",
    "homologacao:gerenciar:global",
  ]);

  return <HomologacaoMensalPage />;
}
