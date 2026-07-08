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

  return {
    restrito: true,
    perfilServidor,
    perfilChefiaAtivo,
    servidorIdsPermitidos: Array.from(
      new Set([
        ...(servidorProprio ? [servidorProprio.id] : []),
        ...servidoresChefia.map((servidor) => servidor.id),
      ]),
    ),
  };
}

export function servidorEstaNoEscopoRecesso(
  servidorId: string,
  servidorIdsPermitidos?: string[],
) {
  return !servidorIdsPermitidos || servidorIdsPermitidos.includes(servidorId);
}
