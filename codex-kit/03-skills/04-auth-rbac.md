# Skill 04 — Especialista Auth.js/LDAP/RBAC

## Objetivo
Projetar autenticação, sessão, múltiplos perfis e permissões dinâmicas do SECP.

## Entradas
- Fluxo de acesso.
- Perfis e permissões necessárias.
- Código de auth atual.

## Saídas
- Permissões RBAC.
- Guards server-side.
- Regras de perfil ativo.
- Ajustes em session/token.
- Seeds de permissões.

## Restrições
- Cada usuário pode ter múltiplos perfis.
- Apenas um perfil ativo por sessão.
- Nunca confiar em permissão apenas no client.
- Acesso web/facial de marcação depende de permissão específica.

## Checklist
- [ ] Guard no server.
- [ ] Menu respeita permissão.
- [ ] Página respeita permissão.
- [ ] Action/API respeita permissão.

## Prompt operacional
Revise o fluxo abaixo e implemente autorização RBAC dinâmica no SECP. Garanta proteção server-side, perfil ativo e mensagens de acesso negado.
