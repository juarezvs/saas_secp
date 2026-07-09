import { TeamsPageShell } from "@/components/teams/teams-page-shell";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function TeamsRelatoriosPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "relatorios:consultar:proprio",
    "relatorios:consultar:global",
  ]);

  return (
    <TeamsPageShell
      titulo="Relatórios"
      descricao="Acesse relatórios do SECP pelo Microsoft Teams."
      hrefPrincipal="/relatorios"
    />
  );
}
