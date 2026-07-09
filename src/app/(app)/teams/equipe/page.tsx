import { TeamsPageShell } from "@/components/teams/teams-page-shell";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function TeamsEquipePage() {
  await exigirPermissaoOuRedirecionar("minha-equipe:consultar:chefia");

  return (
    <TeamsPageShell
      titulo="Equipe"
      descricao="Consulte informações dos servidores subordinados em layout simplificado para chefia."
      hrefPrincipal="/minha-equipe"
    />
  );
}
