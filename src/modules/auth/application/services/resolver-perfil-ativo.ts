import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

export type UsuarioSessaoComPerfis = {
  id?: string;
  nome?: string | null;
  name?: string | null;
  matricula?: string | null;
  perfilAtivo?: PerfilSessao | null;
  perfis?: PerfilSessao[];
};

export function resolverPerfilAtivoDaSessao(
  usuario: UsuarioSessaoComPerfis,
  perfilAtivoCodigo?: string | null,
): PerfilSessao | null {
  const perfis = usuario.perfis ?? [];
  const codigoNormalizado = perfilAtivoCodigo?.toUpperCase();

  return (
    perfis.find(
      (perfil) => perfil.codigo.toUpperCase() === codigoNormalizado,
    ) ??
    usuario.perfilAtivo ??
    perfis[0] ??
    null
  );
}

export function obterTipoDashboardPorPerfil(
  perfilAtivo: PerfilSessao | null,
): "ADMIN" | "GESTOR" | "SERVIDOR" {
  const perfilComNome = perfilAtivo as (PerfilSessao & { nome?: string }) | null;
  const codigo =
    perfilAtivo?.codigo?.toUpperCase() ?? perfilComNome?.nome?.toUpperCase() ?? "";
  const permissoes = perfilAtivo?.permissoes ?? [];

  const isAdmin =
    codigo === "ADMIN" ||
    codigo === "MASTER" ||
    permissoes.includes("usuarios:gerenciar:global") ||
    permissoes.includes("servidores:gerenciar:global") ||
    permissoes.includes("configuracoes:gerenciar:global");

  if (isAdmin) {
    return "ADMIN";
  }

  const isGestor =
    codigo === "GESTOR" ||
    codigo === "CHEFIA" ||
    codigo === "DELEGADO_CHEFIA" ||
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("boletim-frequencia:gerar:chefia");

  if (isGestor) {
    return "GESTOR";
  }

  return "SERVIDOR";
}

export function obterDashboardHrefPorPerfil(
  perfilAtivo: PerfilSessao | null,
): string {
  // O projeto atualmente usa uma única rota /dashboard, que renderiza o
  // componente correto conforme o perfil ativo. Se futuramente forem criadas
  // rotas físicas separadas, altere apenas este mapa.
  const tipoDashboard = obterTipoDashboardPorPerfil(perfilAtivo);

  const dashboardPorPerfil: Record<typeof tipoDashboard, string> = {
    ADMIN: "/dashboard",
    GESTOR: "/dashboard",
    SERVIDOR: "/dashboard",
  };

  return dashboardPorPerfil[tipoDashboard];
}
