import { notFound, redirect } from "next/navigation";

import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import {
  buscarPainelExecutivoPorSlug,
  PERMISSAO_PAINEL_EXECUTIVO,
  PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
} from "@/modules/painel-executivo/presentation/painel-executivo-data";
import { buscarDadosPainelExecutivo } from "@/modules/painel-executivo/infrastructure/repositories/painel-executivo.repository";
import { PainelExecutivoPage } from "@/modules/painel-executivo/presentation/painel-executivo-page";

export default async function PainelExecutivoSecaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ secao: string }>;
  searchParams: Promise<{ competencia?: string }>;
}) {
  const { secao } = await params;
  const { competencia } = await searchParams;
  const painel = buscarPainelExecutivoPorSlug(secao);

  if (!painel) {
    notFound();
  }

  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    PERMISSAO_PAINEL_EXECUTIVO,
    PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
  ]);

  if (
    painel.permissao &&
    !usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      painel.permissao,
    )
  ) {
    redirect(
      `/acesso-negado?permissao=${encodeURIComponent(painel.permissao)}`,
    );
  }

  const dados = await buscarDadosPainelExecutivo({ competencia });

  return (
    <PainelExecutivoPage painel={painel} permissao={permissao} dados={dados} />
  );
}
