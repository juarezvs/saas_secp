# 34 — Skill: Acessibilidade

## Objetivo

Revisar e implementar recursos de acessibilidade, responsividade e usabilidade por teclado.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 17.
- Componentes existentes.
- AppShell.

## Saídas obrigatórias

- AccessibilityToolbar.
- Alto contraste.
- Tema claro/escuro.
- Aumento de fonte.
- Revisão aria/foco.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Foco visível.
- [ ] Labels corretos.
- [ ] Contraste.
- [ ] Responsivo.
- [ ] Navegação por teclado.

## Exemplo de prompt operacional

```txt
Revise a UI usando Skill 34 e Spec 17. Corrija acessibilidade sem alterar regra de negócio.
```
