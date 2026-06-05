import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { EspelhoPontoPageMock } from "@/modules/frequencia/presentation/components/espelho-ponto-page";

export default async function EspelhoPontoPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "espelho-ponto:visualizar:proprio",
    "apuracao:consultar:proprio",
    "apuracao:consultar:global",
  ]);

  return <EspelhoPontoPageMock />;
}
