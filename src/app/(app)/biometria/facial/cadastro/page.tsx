import { redirect } from "next/navigation";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

type CadastroFacialAliasPageProps = {
  searchParams?: Promise<{
    modo?: string;
  }>;
};

export default async function CadastroFacialAliasPage({
  searchParams,
}: CadastroFacialAliasPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "biometriafacial:cadastrar:proprio",
    "biometriafacial:recadastrar:proprio",
    "biometria:cadastrar:proprio",
    "biometria:gerenciar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  redirect(
    params.modo === "recadastro"
      ? "/biometria/cadastro?modo=recadastro"
      : "/biometria/cadastro",
  );
}
