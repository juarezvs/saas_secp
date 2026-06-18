import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { RecessoForenseDashboardReal } from "@/modules/recesso-forense/presentation/components/recesso-forense-dashboard-real";
import {
  listarRecessosDoServidor,
  listarRecessosForenses,
} from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";

export default async function RecessoForensePage() {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:consultar:proprio",
    "recesso:consultar:global",
    "recesso:gerenciar:global",
    "recesso:homologar:chefia",
    "recesso:aceitar:secad",
  ]);

  const perfilServidor = permissao.perfilAtivoCodigo === "SERVIDOR";
  const recessos =
    perfilServidor && permissao.usuarioId
      ? await listarRecessosDoServidor(permissao.usuarioId)
      : await listarRecessosForenses();
  const podeGerenciar = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "recesso:gerenciar:global",
  );

  return (
    <RecessoForenseDashboardReal
      recessos={recessos}
      podeGerenciar={podeGerenciar}
      visualizacaoServidor={perfilServidor}
    />
  );
}
