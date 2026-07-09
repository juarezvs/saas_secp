# Administração da Integração Microsoft Teams

A administração fica em `/administracao/integracoes/teams`.

## Configurações

- Ativação geral da integração.
- Ambiente: desenvolvimento, homologação ou produção.
- Microsoft App ID.
- Microsoft App Password/Secret.
- Tenant ID.
- Bot Endpoint.
- Messaging Endpoint.
- URL pública do SECP.
- Política de envio de notificações.

## Recursos

- Bot conversacional.
- Notificações individuais.
- Adaptive Cards.
- Abas do Teams.
- Registro de ponto pelo Teams.
- Consulta de banco de horas.
- Aprovações pela chefia.
- Homologações pelo Teams.

## Permissões

As permissões administrativas são `integracoes:teams:*`. As permissões de uso são `teams:*`.

O secret é salvo criptografado. Configure `SECP_CRYPTO_KEY` ou `AUTH_SECRET` antes de salvar o Microsoft App Secret.
