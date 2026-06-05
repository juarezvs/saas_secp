# 28 — Skill: Dashboard do Servidor

## Objetivo

Criar dashboard do servidor com próxima ação, marcações do dia, pendências, banco de horas e frequência mensal.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 10.
- Imagem de referência.
- AppShell e componentes base.

## Saídas obrigatórias

- ServidorDashboard.
- NextActionCard.
- MarcacoesDiaTimeline.
- Cards de métricas.
- Alertas.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Próxima ação evidente.
- [ ] Timeline com 4 marcações.
- [ ] Pendências visíveis.
- [ ] Responsivo.

## Exemplo de prompt operacional

```txt
Implemente o Dashboard do Servidor usando Skill 28 e Spec 10, com dados mockados e sem backend.
```
