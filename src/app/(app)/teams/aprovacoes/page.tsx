import { TeamsPageShell } from "@/components/teams/teams-page-shell";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function TeamsAprovacoesPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "teams-aprovacoes:analisar:chefia",
    "solicitacoes:analisar:chefia",
  ]);

  return (
    <TeamsPageShell
      titulo="Aprovações"
      descricao="Analise solicitações pendentes com acesso rápido pelo Microsoft Teams."
      hrefPrincipal="/solicitacoes"
    />
  );
}
