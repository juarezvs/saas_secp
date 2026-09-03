import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarServidoresParaEspelhoPonto,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";

type PermissaoSessao = {
  usuarioId?: string;
  perfilAtivoCodigo?: string | null;
  permissoes: string[];
};

export async function resolverEscopoServidoresRecesso(
  permissao: PermissaoSessao,
) {
  const perfilServidor = permissao.perfilAtivoCodigo === "SERVIDOR";
  const perfilChefiaAtivo = perfilAtivoEhChefia({
    perfilAtivoCodigo: permissao.perfilAtivoCodigo,
    permissoes: permissao.permissoes,
  });

  if (!permissao.usuarioId || (!perfilServidor && !perfilChefiaAtivo)) {
    return {
      restrito: false,
      perfilServidor,
      perfilChefiaAtivo,
      servidorIdsPermitidos: undefined,
      orgaoIdsPermitidos: undefined,
    };
  }

  const [servidorProprio, servidoresChefia] = await Promise.all([
    buscarServidorComUsuarioPorUsuarioId(permissao.usuarioId),
    perfilChefiaAtivo
      ? listarServidoresParaEspelhoPonto({
          usuarioId: permissao.usuarioId,
          escopo: "chefia",
        })
      : Promise.resolve([]),
  ]);

  const servidoresPermitidos = [
    ...(servidorProprio ? [servidorProprio] : []),
    ...servidoresChefia,
  ];

  return {
    restrito: true,
    perfilServidor,
    perfilChefiaAtivo,
    servidorIdsPermitidos: Array.from(
      new Set(servidoresPermitidos.map((servidor) => servidor.id)),
    ),
    orgaoIdsPermitidos: Array.from(
      new Set(
        servidoresPermitidos
          .map((servidor) => servidor.orgaoId)
          .filter((orgaoId): orgaoId is string => Boolean(orgaoId)),
      ),
    ),
  };
}

export function servidorEstaNoEscopoRecesso(
  servidorId: string,
  servidorIdsPermitidos?: string[],
) {
  return !servidorIdsPermitidos || servidorIdsPermitidos.includes(servidorId);
}
