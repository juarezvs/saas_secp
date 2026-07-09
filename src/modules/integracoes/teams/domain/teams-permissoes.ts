export const TEAMS_PERMISSOES = {
  visualizar: "integracoes:teams:visualizar",
  configurar: "integracoes:teams:configurar",
  ativar: "integracoes:teams:ativar",
  desativar: "integracoes:teams:desativar",
  testar: "integracoes:teams:testar",
  baixarManifesto: "integracoes:teams:baixar-manifesto",
  botUsar: "teams:bot:usar",
  notificacoesReceber: "teams:notificacoes:receber",
  pontoRegistrar: "teams:ponto:registrar",
  bancoHorasConsultar: "teams:banco-horas:consultar",
  solicitacoesCriar: "teams:solicitacoes:criar",
  aprovacoesAnalisar: "teams:aprovacoes:analisar",
  homologacaoAnalisar: "teams:homologacao:analisar",
} as const;

export const TEAMS_PERMISSOES_ADMIN = [
  TEAMS_PERMISSOES.visualizar,
  TEAMS_PERMISSOES.configurar,
  TEAMS_PERMISSOES.ativar,
  TEAMS_PERMISSOES.desativar,
  TEAMS_PERMISSOES.testar,
  TEAMS_PERMISSOES.baixarManifesto,
] as const;
