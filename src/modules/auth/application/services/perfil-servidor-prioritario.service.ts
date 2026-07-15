import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

export function escolherPerfilInicial(params: {
  tipoUsuario?: string | null;
  perfis: PerfilSessao[];
  perfilPreferido?: PerfilSessao | null;
}) {
  const perfilMaster = params.perfis.find(
    (perfil) => perfil.codigo.toUpperCase() === "MASTER",
  );

  if (!params.perfilPreferido && perfilMaster) {
    return perfilMaster;
  }

  const codigoPerfilPorTipoUsuario: Record<string, string> = {
    SERVIDOR: "SERVIDOR",
    ESTAGIARIO: "ESTAGIARIO",
    PRESTADOR: "PRESTADOR",
    VOLUNTARIO: "VOLUNTARIO",
  };
  const codigoPerfilPrioritario =
    codigoPerfilPorTipoUsuario[params.tipoUsuario?.toUpperCase() ?? ""];
  const perfilPessoaPonto = params.perfis.find(
    (perfil) => perfil.codigo.toUpperCase() === codigoPerfilPrioritario,
  );
  const devePriorizarPessoaPonto =
    !params.perfilPreferido &&
    Boolean(codigoPerfilPrioritario) &&
    params.perfis.length > 1 &&
    Boolean(perfilPessoaPonto);

  if (devePriorizarPessoaPonto) {
    return perfilPessoaPonto ?? null;
  }

  return params.perfilPreferido ?? params.perfis[0] ?? null;
}
