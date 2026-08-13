import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";
import {
  resolverDashboardPerfil,
  type DashboardPerfil,
} from "@/modules/dashboard/application/resolver-dashboard-perfil";
import { escolherPerfilInicial } from "./perfil-servidor-prioritario.service";

export type UsuarioSessaoComPerfis = {
  id?: string;
  nome?: string | null;
  name?: string | null;
  matricula?: string | null;
  tipo?: string | null;
  perfilAtivo?: PerfilSessao | null;
  perfis?: PerfilSessao[];
};

export function resolverPerfilAtivoDaSessao(
  usuario: UsuarioSessaoComPerfis,
  perfilAtivoCodigo?: string | null,
): PerfilSessao | null {
  const perfis = usuario.perfis ?? [];
  const codigoNormalizado = perfilAtivoCodigo?.toUpperCase();

  const perfilPreferido =
    perfis.find(
      (perfil) => perfil.codigo.toUpperCase() === codigoNormalizado,
    ) ??
    usuario.perfilAtivo;

  return escolherPerfilInicial({
    tipoUsuario: usuario.tipo,
    perfis,
    perfilPreferido,
    respeitarPerfilPreferido: Boolean(codigoNormalizado || usuario.perfilAtivo),
  });
}

export function obterTipoDashboardPorPerfil(
  perfilAtivo: PerfilSessao | null,
): DashboardPerfil {
  return resolverDashboardPerfil(perfilAtivo);
}

export function obterDashboardHrefPorPerfil(
  perfilAtivo: PerfilSessao | null,
): string {
  // O projeto atualmente usa uma única rota /dashboard, que renderiza o
  // componente correto conforme o perfil ativo. Se futuramente forem criadas
  // rotas físicas separadas, altere apenas este mapa.
  const tipoDashboard = obterTipoDashboardPorPerfil(perfilAtivo);

  const dashboardPorPerfil: Record<DashboardPerfil, string> = {
    ADMIN: "/dashboard",
    MASTER: "/dashboard",
    SUPORTE: "/dashboard",
    GESTOR: "/dashboard",
    SERVIDOR: "/dashboard",
    SECAP: "/dashboard",
    AUDITOR: "/dashboard",
    DIREF: "/dashboard",
    GENERICO: "/dashboard",
  };

  return dashboardPorPerfil[tipoDashboard];
}
