# 02 — Harness Prisma/PostgreSQL

## Prompt operacional
Antes de alterar código que usa Prisma:
1. Leia `prisma/schema.prisma`.
2. Confirme nomes de models, campos, enums e relações.
3. Não invente campos.
4. Se um campo for necessário e não existir, proponha alteração de schema e migration.
5. Use transações quando envolver Usuario + Servidor + Perfil + Jornada.
6. Para rotinas críticas, criar auditoria.

## Cuidados recorrentes
- `Usuario` deve ter `cpf` se o fluxo exige CPF do usuário.
- `Servidor` também deve ter `cpf`.
- `BiometriaFacialServidor` usa `status`, não necessariamente `ativo`.
- `StatusSolicitacao` real: RASCUNHO, ENVIADA, EM_ANALISE, DEFERIDA, INDEFERIDA, CANCELADA.
- Não usar relação que não existe no Prisma Client.
