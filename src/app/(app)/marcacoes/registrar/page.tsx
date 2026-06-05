import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { RegistroPontoPage } from "@/modules/marcacoes/presentation/components/registro-ponto-page";

export default async function RegistrarMarcacaoPage() {
  await exigirPermissaoOuRedirecionar("marcacoes:registrar:proprio");

  return <RegistroPontoPage />;
}
