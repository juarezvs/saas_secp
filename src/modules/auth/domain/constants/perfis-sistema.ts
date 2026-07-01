export const CODIGOS_PERFIL_ADMINISTRADOR_SISTEMA = ["MASTER"];
export const CODIGO_PERFIL_ADMINISTRADOR_SECCIONAL = "ADMIN";
export const CODIGOS_PERFIL_EXCECAO_REGISTRO_PONTO = [
  "EXCECAO_REGISTRO_WEB",
  "EXCECAO_REGISTRO_FACIAL",
];

export const PERMISSOES_REGISTRO_PONTO_WEB = [
  "marcacoes:registrar:proprio",
  "marcacoes:registrar-web:proprio",
];

export const PERMISSOES_REGISTRO_PONTO_FACIAL = [
  "marcacoes:registrar:proprio",
  "marcacoes:registrar-facial:proprio",
  "biometria:validar:proprio",
  "biometriafacial:registrar:proprio",
];

export const PERMISSOES_EXCECAO_REGISTRO_PONTO = [
  ...PERMISSOES_REGISTRO_PONTO_WEB,
  ...PERMISSOES_REGISTRO_PONTO_FACIAL,
];

export const PERMISSOES_ACESSO_REGISTRO_PONTO_SECP = [
  "marcacoes:registrar-web:proprio",
  "marcacoes:registrar-facial:proprio",
];

type PerfilComCodigo = {
  codigo?: string | null;
};

export function perfilEhAdministradorSistema(perfil?: PerfilComCodigo | null) {
  return CODIGOS_PERFIL_ADMINISTRADOR_SISTEMA.includes(
    perfil?.codigo?.toUpperCase() ?? "",
  );
}

export function perfilEhAdministradorSeccional(
  perfil?: PerfilComCodigo | null,
) {
  return (
    perfil?.codigo?.toUpperCase() === CODIGO_PERFIL_ADMINISTRADOR_SECCIONAL
  );
}

export function perfilEhExcecaoRegistroPonto(
  perfil?: PerfilComCodigo | null,
) {
  return CODIGOS_PERFIL_EXCECAO_REGISTRO_PONTO.includes(
    perfil?.codigo?.toUpperCase() ?? "",
  );
}

export function perfilDeveFicarOcultoNaTrocaDePerfil(
  perfil?: PerfilComCodigo | null,
) {
  return perfilEhExcecaoRegistroPonto(perfil);
}
