export type TeamsAmbiente = "desenvolvimento" | "homologacao" | "producao";

export type TeamsPoliticaEnvioNotificacoes =
  "somente_vinculados" | "todos_vinculados" | "desativado";

export type TeamsConfiguracaoInput = {
  ativo: boolean;
  ambiente: TeamsAmbiente;
  microsoftAppId?: string | null;
  microsoftAppSecret?: string | null;
  tenantId?: string | null;
  botEndpoint?: string | null;
  messagingEndpoint?: string | null;
  urlPublicaSecp?: string | null;
  politicaEnvioNotificacoes: TeamsPoliticaEnvioNotificacoes;
  botConversacionalAtivo: boolean;
  notificacoesAtivas: boolean;
  adaptiveCardsAtivos: boolean;
  abasTeamsAtivas: boolean;
  registroPontoAtivo: boolean;
  consultaBancoHorasAtiva: boolean;
  aprovacoesAtivas: boolean;
  homologacoesAtivas: boolean;
};

export type TeamsLogInput = {
  tipo: string;
  direcao: "ENTRADA" | "SAIDA" | "INTERNO";
  usuarioId?: string | null;
  teamsUserId?: string | null;
  evento: string;
  payloadResumo?: string | null;
  sucesso?: boolean;
  erro?: string | null;
};
