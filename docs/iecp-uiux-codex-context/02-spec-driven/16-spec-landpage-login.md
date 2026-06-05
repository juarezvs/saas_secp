# 16 — Spec: Landpage e Login

## Objetivo

Criar as telas públicas do SECP: apresentação institucional e login com matrícula/senha da rede Windows.

## Escopo

- Landpage.
- Login.
- Cards de funcionalidades.
- Mensagens institucionais.
- Link de suporte NUTEC.

## Landpage

Deve apresentar:

- nome SECP;
- frase institucional;
- benefícios;
- funcionalidades;
- segurança e conformidade;
- botão “Entrar com matrícula da rede”.

## Login

Inspirado em fluxo gov.br, mas com identidade própria.

Campos:

- Matrícula.
- Senha da rede Windows.

Mensagens:

- “Acesse com sua matrícula e senha da rede.”
- “Problemas de acesso? Acione o NUTEC.”

## Fora de escopo

- Autenticação LDAP real.
- Recuperação de senha.
- Provedores externos.

## Critérios de aceite

- Visual institucional.
- Login claro e objetivo.
- Sem CPF como campo principal.
- Responsivo.
- Mensagens de erro amigáveis.

## Prompt operacional

```txt
Implemente a SPEC 16: landpage e login do SECP.
Use a identidade visual definida.
Não implemente autenticação real; crie somente layout e estados visuais.
```
