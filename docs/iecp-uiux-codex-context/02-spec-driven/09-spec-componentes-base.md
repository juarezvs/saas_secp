# 09 — Spec: Componentes base reutilizáveis

## Objetivo

Criar componentes de UI reutilizáveis para todas as telas do SECP.

## Componentes mínimos

- `Button`.
- `Card`.
- `Badge`.
- `Input`.
- `Select`.
- `Textarea`.
- `Modal`.
- `Skeleton`.
- `Tooltip`.
- `PageHeader`.
- `InstructionCard`.
- `PortariaRuleCard`.
- `DeadlineAlert`.
- `StatusBadge`.
- `EmptyStateGuided`.

## Regras

- Todos devem aceitar `className`.
- Todos devem ter foco visível quando interativos.
- Todos devem funcionar em tema claro e escuro.
- Nenhum componente deve depender de dados reais do SECP.
- Componentes de regra da Portaria devem receber props, não texto fixo.

## Variantes de Button

- primary.
- secondary.
- outline.
- ghost.
- danger.
- success.

## Variantes de StatusBadge

- regular.
- pendente.
- critico.
- homologado.
- indeferido.
- aguardando.
- recesso.

## Critérios de aceite

- Componentes usados por pelo menos uma tela demo.
- Sem duplicação de estilos.
- Tipagem clara.
- Estados disabled/loading quando aplicável.

## Prompt operacional

```txt
Implemente a SPEC 09: componentes base reutilizáveis.
Use tokens da SPEC 08.
Não implemente telas finais ainda, apenas componentes e uma página de demonstração se necessário.
Garanta TypeScript estrito e acessibilidade.
```
