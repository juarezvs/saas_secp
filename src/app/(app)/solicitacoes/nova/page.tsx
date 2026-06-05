import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { SolicitacaoAjustePontoPage } from "@/modules/solicitacoes/presentation/components/solicitacao-ajuste-ponto-page";

export default async function NovaSolicitacaoPage() {
  await exigirPermissaoOuRedirecionar("solicitacoes:criar:proprio");

  return <SolicitacaoAjustePontoPage />;
}
