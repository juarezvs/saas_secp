import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

export type DashboardPerfil =
  | "SERVIDOR"
  | "GESTOR"
  | "ADMIN"
  | "MASTER"
  | "SUPORTE"
  | "SECAP"
  | "AUDITOR"
  | "DIREF"
  | "GENERICO";

export function resolverDashboardPerfil(
  perfilAtivo: PerfilSessao | null | undefined,
): DashboardPerfil {
  const codigo = perfilAtivo?.codigo?.toUpperCase() ?? "";
  const permissoes = perfilAtivo?.permissoes ?? [];

  if (codigo === "MASTER") return "MASTER";
  if (codigo === "DIREF") return "DIREF";
  if (codigo === "SECAP") return "SECAP";
  if (codigo === "AUDITOR") return "AUDITOR";
  if (["SUPORTE", "SUPORTE_TECNICO", "NUTEC"].includes(codigo)) {
    return "SUPORTE";
  }
  if (codigo === "ADMIN") return "ADMIN";

  if (
    codigo === "GESTOR" ||
    codigo === "CHEFIA" ||
    codigo === "GESTOR_UNIDADE" ||
    codigo === "DELEGADO_CHEFIA" ||
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("boletim-frequencia:gerar:chefia")
  ) {
    return "GESTOR";
  }

  if (
    permissoes.includes("auditoria:consultar:global") ||
    permissoes.includes("auditoria:detalhar:global")
  ) {
    return "AUDITOR";
  }

  if (
    permissoes.includes("boletim-frequencia:consultar:global") ||
    permissoes.includes("boletim-frequencia:receber:global")
  ) {
    return "SECAP";
  }

  if (
    permissoes.includes("integracoes:gerenciar:global") ||
    permissoes.includes("integracoes-sarh:executar:global") ||
    permissoes.includes("integracoes-sarh:reprocessar:global") ||
    permissoes.includes("afd:importar:global")
  ) {
    return "SUPORTE";
  }

  if (
    permissoes.includes("configuracoes:gerenciar:global") ||
    permissoes.includes("usuarios:gerenciar:global") ||
    permissoes.includes("servidores:gerenciar:global")
  ) {
    return "ADMIN";
  }

  if (codigo === "SERVIDOR" || permissoes.includes("marcacoes:consultar:proprio")) {
    return "SERVIDOR";
  }

  return "GENERICO";
}
