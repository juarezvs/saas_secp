export const TEAMS_PERMISSOES = {
  visualizar: "integracoes-teams:visualizar:global",
  configurar: "integracoes-teams:configurar:global",
  ativar: "integracoes-teams:ativar:global",
  desativar: "integracoes-teams:desativar:global",
  testar: "integracoes-teams:testar:global",
  baixarManifesto: "integracoes-teams:baixar-manifesto:global",
  botUsar: "teams-bot:usar:proprio",
  notificacoesReceber: "teams-notificacoes:receber:proprio",
  pontoRegistrar: "teams-ponto:registrar:proprio",
  bancoHorasConsultar: "teams-banco-horas:consultar:proprio",
  solicitacoesCriar: "teams-solicitacoes:criar:proprio",
  aprovacoesAnalisar: "teams-aprovacoes:analisar:chefia",
  homologacaoAnalisar: "teams-homologacao:analisar:chefia",
} as const;

export const TEAMS_PERMISSOES_ADMIN = [
  TEAMS_PERMISSOES.visualizar,
  TEAMS_PERMISSOES.configurar,
  TEAMS_PERMISSOES.ativar,
  TEAMS_PERMISSOES.desativar,
  TEAMS_PERMISSOES.testar,
  TEAMS_PERMISSOES.baixarManifesto,
] as const;
