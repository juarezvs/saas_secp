import { TeamsPageShell } from "@/components/teams/teams-page-shell";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function TeamsBancoHorasPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "teams-banco-horas:consultar:proprio",
    "banco-horas:consultar:proprio",
  ]);

  return (
    <TeamsPageShell
      titulo="Banco de Horas"
      descricao="Consulte o consolidado do seu banco de horas a partir do Microsoft Teams."
      hrefPrincipal="/banco-horas"
    />
  );
}
