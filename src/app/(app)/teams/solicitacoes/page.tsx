import { TeamsPageShell } from "@/components/teams/teams-page-shell";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function TeamsSolicitacoesPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "teams-solicitacoes:criar:proprio",
    "solicitacoes:consultar:proprio",
  ]);

  return (
    <TeamsPageShell
      titulo="Solicitações"
      descricao="Crie e acompanhe solicitações de frequência em modo Microsoft Teams."
      hrefPrincipal="/solicitacoes"
    />
  );
}
