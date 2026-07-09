# SECP para Microsoft Teams

O módulo Microsoft Teams permite expor o SECP por bot conversacional, abas pessoais, Adaptive Cards e notificações individuais.

## Endpoints

- Bot: `/api/bot/teams/messages`
- Configuração: `/api/integracoes/teams/configuracao`
- Logs: `/api/integracoes/teams/logs`
- Manifesto JSON: `/api/integracoes/teams/manifest`
- Pacote Teams: `/api/integracoes/teams/manifest.zip`

## Abas

- `/teams/meu-ponto`
- `/teams/banco-horas`
- `/teams/solicitacoes`
- `/teams/equipe`
- `/teams/aprovacoes`
- `/teams/relatorios`

As abas usam Auth.js, sessão SECP, perfil ativo e RBAC.

## Referências

- Microsoft Teams app package: https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/apps-package
- Microsoft 365 app manifest schema: https://learn.microsoft.com/en-us/microsoft-365/extensibility/schema/
- Proactive messages no Teams: https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages
