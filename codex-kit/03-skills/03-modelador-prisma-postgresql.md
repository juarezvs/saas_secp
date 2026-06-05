# Skill 03 — Modelador Prisma/PostgreSQL

## Objetivo
Evoluir o schema Prisma/PostgreSQL mantendo integridade, rastreabilidade e performance.

## Entradas
- Regras do módulo.
- Schema atual.
- Relações necessárias.

## Saídas
- Models Prisma.
- Enums.
- Índices.
- Constraints.
- Estratégia de migration.
- Impactos em seeds e código.

## Restrições
- Usar nomes em português nos modelos/campos novos.
- Não quebrar relações existentes.
- Não inventar campos sem verificar schema.
- Dados brutos de marcação devem ser imutáveis.

## Checklist
- [ ] `npx prisma validate` passa.
- [ ] Índices para filtros principais.
- [ ] Campos auditáveis: criadoEm, atualizadoEm quando aplicável.
- [ ] Unicidade onde necessário.

## Prompt operacional
Analise o schema atual e proponha alteração Prisma para atender ao módulo abaixo. Inclua models, enums, relações, índices, migration e impacto no código existente.
