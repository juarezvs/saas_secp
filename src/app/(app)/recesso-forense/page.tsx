import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { RecessoForenseDashboardReal } from "@/modules/recesso-forense/presentation/components/recesso-forense-dashboard-real";
import { resolverEscopoServidoresRecesso } from "@/modules/recesso-forense/application/services/escopo-recesso-forense.service";
import {
  listarRecessosForenses,
  listarRecessosPorServidores,
} from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";

export default async function RecessoForensePage() {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:consultar:proprio",
    "recesso:consultar:global",
    "recesso:gerenciar:global",
    "recesso:gerenciar:seccional",
    "recesso:homologar:chefia",
    "recesso:aceitar:seccional",
  ]);

  const escopoRecesso = await resolverEscopoServidoresRecesso(permissao);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoRecesso.restrito
    ? escopoRecesso.orgaoIdsPermitidos
    : escopoOrgao.global
      ? undefined
      : escopoOrgao.orgaoIds;
  const recessos = escopoRecesso.restrito
    ? await listarRecessosPorServidores(
        escopoRecesso.servidorIdsPermitidos ?? [],
        { orgaoIdsPermitidos },
      )
    : await listarRecessosForenses({ orgaoIdsPermitidos });
  const podeGerenciar =
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "recesso:gerenciar:global",
    ) ||
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "recesso:gerenciar:seccional",
    );

  return (
    <RecessoForenseDashboardReal
      recessos={recessos}
      podeGerenciar={podeGerenciar}
      visualizacaoServidor={escopoRecesso.restrito}
      podeGerenciarConvocacoes={escopoRecesso.perfilChefiaAtivo}
    />
  );
}
