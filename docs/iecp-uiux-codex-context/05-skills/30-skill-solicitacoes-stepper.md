# 30 — Skill: Solicitações Stepper

## Objetivo

Criar fluxo genérico de solicitações por etapas, reutilizável e auto-instrucional.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 12.
- Tipos de solicitação.
- Componentes base.

## Saídas obrigatórias

- Stepper.
- SolicitacaoStepper.
- AjustePontoForm mockado.
- Revisão e comprovante.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Etapas visíveis.
- [ ] Validação mínima.
- [ ] Regra da Portaria exibida.
- [ ] Comprovante gerado.

## Exemplo de prompt operacional

```txt
Implemente o Stepper de solicitações conforme Skill 30 e Spec 12, iniciando por Ajuste de Ponto mockado.
```
