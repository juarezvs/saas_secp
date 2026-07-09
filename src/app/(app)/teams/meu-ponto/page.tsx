import { TeamsPageShell } from "@/components/teams/teams-page-shell";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function TeamsMeuPontoPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "marcacoes:consultar:proprio",
    "apuracao:consultar:proprio",
  ]);

  return (
    <TeamsPageShell
      titulo="Meu Ponto"
      descricao="Acompanhe marcações, apuração e espelho de ponto em layout simplificado para o Microsoft Teams."
      hrefPrincipal="/espelho-ponto"
    />
  );
}
