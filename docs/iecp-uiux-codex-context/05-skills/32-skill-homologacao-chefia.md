# 32 — Skill: Homologação da Chefia

## Objetivo

Criar painel de homologação como fila de decisão, priorizando pendências críticas.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 14.
- Perfis gestor/delegado.
- Componentes de workflow.

## Saídas obrigatórias

- HomologacaoQueue.
- ServidorFrequenciaReview.
- ApprovalFlow.
- DeadlineAlert.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Pendências priorizadas.
- [ ] Prazo visível.
- [ ] Ações de decisão claras.
- [ ] Regra normativa exibida.

## Exemplo de prompt operacional

```txt
Implemente painel de homologação conforme Skill 32 e Spec 14, com dados mockados.
```
