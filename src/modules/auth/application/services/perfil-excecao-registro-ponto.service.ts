import {
  perfilDeveFicarOcultoNaTrocaDePerfil,
  perfilEhExcecaoRegistroPonto,
} from "../../domain/constants/perfis-sistema";
import type { PerfilSessao } from "../../domain/entities/usuario-autenticado";

export function aplicarExcecoesRegistroPontoAoPerfilServidor(
  perfis: PerfilSessao[],
): PerfilSessao[] {
  const permissoesExcecaoRegistroPonto = new Set(
    perfis
      .filter((perfil) => perfilEhExcecaoRegistroPonto(perfil))
      .flatMap((perfil) => perfil.permissoes),
  );

  return perfis
    .filter((perfil) => !perfilDeveFicarOcultoNaTrocaDePerfil(perfil))
    .map((perfil) => {
      if (perfil.codigo.toUpperCase() !== "SERVIDOR") {
        return perfil;
      }

      return {
        ...perfil,
        permissoes: Array.from(
          new Set([...perfil.permissoes, ...permissoesExcecaoRegistroPonto]),
        ).sort(),
      };
    });
}
