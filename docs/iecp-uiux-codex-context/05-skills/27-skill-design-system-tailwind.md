# 27 — Skill: Design System Tailwind

## Objetivo

Criar tokens visuais e componentes base do SECP usando Tailwind CSS v4 e CSS variables.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 08 e 09.
- Paleta institucional.
- Estrutura de componentes.

## Saídas obrigatórias

- Tokens CSS.
- Componentes base.
- StatusBadge.
- InstructionCard.
- PortariaRuleCard.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Tokens centralizados.
- [ ] Componentes tipados.
- [ ] Estados focus/disabled/loading.
- [ ] Tema claro/escuro preparado.

## Exemplo de prompt operacional

```txt
Implemente tokens e componentes base do SECP conforme Skill 27, Specs 08 e 09. Não crie páginas finais.
```
