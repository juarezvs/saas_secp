import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

export function escolherPerfilInicial(params: {
  tipoUsuario?: string | null;
  perfis: PerfilSessao[];
  perfilPreferido?: PerfilSessao | null;
}) {
  const perfilServidor = params.perfis.find(
    (perfil) => perfil.codigo.toUpperCase() === "SERVIDOR",
  );
  const devePriorizarServidor =
    !params.perfilPreferido &&
    params.tipoUsuario?.toUpperCase() === "SERVIDOR" &&
    params.perfis.length > 1 &&
    Boolean(perfilServidor);

  if (devePriorizarServidor) {
    return perfilServidor ?? null;
  }

  return params.perfilPreferido ?? params.perfis[0] ?? null;
}
