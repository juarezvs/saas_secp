export const CODIGOS_PERFIL_ADMINISTRADOR_SISTEMA = ["ADMIN", "MASTER"];

type PerfilComCodigo = {
  codigo?: string | null;
};

export function perfilEhAdministradorSistema(perfil?: PerfilComCodigo | null) {
  return CODIGOS_PERFIL_ADMINISTRADOR_SISTEMA.includes(
    perfil?.codigo?.toUpperCase() ?? "",
  );
}
