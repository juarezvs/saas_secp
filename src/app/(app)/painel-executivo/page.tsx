import { redirect } from "next/navigation";

import {
  PERMISSAO_PAINEL_EXECUTIVO,
  PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
  PERMISSOES_SUBMENUS_PAINEL_EXECUTIVO,
  paineisExecutivos,
  painelExecutivoInicial,
} from "@/modules/painel-executivo/presentation/painel-executivo-data";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";

export default async function PainelExecutivoIndexPage() {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    PERMISSAO_PAINEL_EXECUTIVO,
    PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
    ...PERMISSOES_SUBMENUS_PAINEL_EXECUTIVO,
  ]);
  const primeiroPainelPermitido =
    paineisExecutivos.find(
      (painel) =>
        !painel.permissao ||
        usuarioPossuiPermissaoNoPerfil(
          permissao.perfilAtivoCodigo,
          permissao.permissoes,
          PERMISSAO_PAINEL_EXECUTIVO,
        ) ||
        (painel.slug === "equipamentos-de-ponto" &&
          usuarioPossuiPermissaoNoPerfil(
            permissao.perfilAtivoCodigo,
            permissao.permissoes,
            PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
          )) ||
        usuarioPossuiPermissaoNoPerfil(
          permissao.perfilAtivoCodigo,
          permissao.permissoes,
          painel.permissao,
        ),
    ) ?? painelExecutivoInicial;

  redirect(`/painel-executivo/${primeiroPainelPermitido.slug}`);
}
