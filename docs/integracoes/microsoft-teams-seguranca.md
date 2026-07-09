# Segurança da Integração Microsoft Teams

## Princípios

- Nenhuma ação Teams executa se a integração estiver desativada.
- Nenhuma ação sensível executa sem RBAC.
- Falhas de Teams não interrompem ponto, homologação, banco de horas ou aprovações do SECP.
- Secrets não são salvos em texto puro.
- Logs devem conter apenas resumo sem payload sensível.

## Bot Framework

O endpoint `/api/bot/teams/messages` exige cabeçalho `Authorization: Bearer`.

Antes de produção, valide o JWT do Bot Framework contra os metadados oficiais e confira audience/App ID e tenant conforme o registro do aplicativo.

## Entra ID

O login corporativo do Teams passa pelo Microsoft Entra ID. Para SSO completo, registre o aplicativo no tenant do TRF1 e configure Redirect URI compatível com Auth.js.

Referências:

- OpenID Connect no Microsoft identity platform: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- Redirect URI: https://learn.microsoft.com/en-us/entra/identity-platform/reply-url
