import {
  perfilDeveFicarOcultoNaTrocaDePerfil,
  perfilEhExcecaoRegistroPonto,
} from "../../domain/constants/perfis-sistema";
import type { PerfilSessao } from "../../domain/entities/usuario-autenticado";

export function aplicarExcecoesRegistroPontoAoPerfilServidor(
  perfis: PerfilSessao[],
): PerfilSessao[] {
  const permissoesPorPerfilDestino = perfis
    .filter((perfil) => perfilEhExcecaoRegistroPonto(perfil))
    .reduce((mapa, perfil) => {
      if (!perfil.perfilDestinoExcecaoId) {
        return mapa;
      }

      const permissoes = mapa.get(perfil.perfilDestinoExcecaoId) ?? new Set<string>();

      for (const permissao of perfil.permissoes) {
        permissoes.add(permissao);
      }

      mapa.set(perfil.perfilDestinoExcecaoId, permissoes);
      return mapa;
    }, new Map<string, Set<string>>());

  return perfis
    .filter((perfil) => !perfilDeveFicarOcultoNaTrocaDePerfil(perfil))
    .map((perfil) => {
      if (perfilEhExcecaoRegistroPonto(perfil)) {
        return perfil;
      }

      const permissoesExcecao = permissoesPorPerfilDestino.get(perfil.id);

      if (!permissoesExcecao) {
        return perfil;
      }

      return {
        ...perfil,
        permissoes: Array.from(
          new Set([...perfil.permissoes, ...permissoesExcecao]),
        ).sort(),
      };
    });
}
