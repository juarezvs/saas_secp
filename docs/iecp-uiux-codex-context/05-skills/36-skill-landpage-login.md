# 36 — Skill: Landpage e Login

## Objetivo

Criar telas públicas institucionais do SECP, incluindo login por matrícula e senha da rede.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 16.
- Identidade visual.

## Saídas obrigatórias

- Landpage.
- Login.
- Cards de funcionalidades.
- Mensagens de suporte.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Campo matrícula, não CPF.
- [ ] Visual institucional.
- [ ] Responsivo.
- [ ] Mensagens amigáveis.

## Exemplo de prompt operacional

```txt
Implemente landpage e login conforme Skill 36 e Spec 16. Não implemente LDAP real.
```
