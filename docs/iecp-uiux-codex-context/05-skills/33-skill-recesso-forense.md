# 33 — Skill: Recesso Forense

## Objetivo

Criar módulo visual de recesso forense separado do ponto ordinário.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 15.
- Fluxo recesso: servidor → chefia → SECAD → SEPAG/SECAP.

## Saídas obrigatórias

- RecessoDashboard.
- RecessoPeriodoCard.
- ConvocadosTable.
- RecessoApprovalFlow.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Dezembro/janeiro separados.
- [ ] Dias não convocados mostram Recesso forense.
- [ ] Chefia responsável visível.
- [ ] Fluxo próprio claro.

## Exemplo de prompt operacional

```txt
Implemente módulo visual de recesso conforme Skill 33 e Spec 15. Não calcule pecúnia/folga ainda.
```
