import type { IntegracaoTeamsConfiguracao } from "@/generated/prisma/client";

const ABAS = [
  ["Meu Ponto", "/teams/meu-ponto"],
  ["Banco de Horas", "/teams/banco-horas"],
  ["Solicitações", "/teams/solicitacoes"],
  ["Equipe", "/teams/equipe"],
  ["Aprovações", "/teams/aprovacoes"],
  ["Relatórios", "/teams/relatorios"],
] as const;

function urlAbsoluta(base: string, path: string) {
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
}

function dominioValido(urlPublicaSecp: string | null) {
  if (!urlPublicaSecp) {
    return "localhost";
  }

  try {
    return new URL(urlPublicaSecp).hostname;
  } catch {
    return "localhost";
  }
}

export function gerarTeamsManifest(
  config: Pick<
    IntegracaoTeamsConfiguracao,
    | "microsoftAppId"
    | "botEndpoint"
    | "urlPublicaSecp"
    | "abasTeamsAtivas"
    | "botConversacionalAtivo"
  >,
) {
  const appId = config.microsoftAppId || "00000000-0000-0000-0000-000000000000";
  const urlPublicaSecp = config.urlPublicaSecp || "https://secp.exemplo.local";
  const validDomain = dominioValido(urlPublicaSecp);

  return {
    $schema:
      "https://developer.microsoft.com/en-us/json-schemas/teams/v1.19/MicrosoftTeams.schema.json",
    manifestVersion: "1.19",
    version: "1.0.0",
    id: appId,
    packageName: "br.jus.trf1.secp",
    developer: {
      name: "SECP",
      websiteUrl: urlPublicaSecp,
      privacyUrl: urlAbsoluta(urlPublicaSecp, "/privacidade"),
      termsOfUseUrl: urlAbsoluta(urlPublicaSecp, "/termos-de-uso"),
    },
    name: {
      short: "SECP",
      full: "Sistema Eletrônico de Controle de Ponto",
    },
    description: {
      short: "Controle eletrônico de ponto no Microsoft Teams.",
      full: "Sistema Eletrônico de Controle de Ponto integrado ao Microsoft Teams para consultas, notificações e aprovações.",
    },
    icons: {
      outline: "outline.png",
      color: "color.png",
    },
    accentColor: "#0f172a",
    bots: config.botConversacionalAtivo
      ? [
          {
            botId: appId,
            scopes: ["personal"],
            supportsFiles: false,
            isNotificationOnly: false,
          },
        ]
      : [],
    staticTabs: config.abasTeamsAtivas
      ? ABAS.map(([name, path], index) => ({
          entityId: `secp-${index + 1}`,
          name,
          contentUrl: urlAbsoluta(urlPublicaSecp, path),
          websiteUrl: urlAbsoluta(urlPublicaSecp, path),
          scopes: ["personal"],
        }))
      : [],
    validDomains: [validDomain],
    webApplicationInfo: {
      id: appId,
      resource: `api://${validDomain}/${appId}`,
    },
    authorization: {
      permissions: {
        resourceSpecific: [],
      },
    },
  };
}
