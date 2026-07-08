export function perfilAtivoEhChefia(params: {
  perfilAtivoCodigo?: string | null;
  permissoes?: string[];
}) {
  const codigo = params.perfilAtivoCodigo?.toUpperCase() ?? "";
  const permissoes = params.permissoes ?? [];

  if (
    ["CHEFIA", "GESTOR", "GESTOR_UNIDADE", "DELEGADO_CHEFIA"].includes(codigo)
  ) {
    return true;
  }

  if (
    ["ADMIN", "MASTER", "SUPORTE", "SUPORTE_TECNICO", "NUTEC"].includes(codigo)
  ) {
    return false;
  }

  return (
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("boletim-frequencia:gerar:chefia") ||
    permissoes.includes("minha-equipe:consultar:chefia")
  );
}
