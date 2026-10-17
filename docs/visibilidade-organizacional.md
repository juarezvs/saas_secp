# Visibilidade de órgãos e unidades

Órgãos inativos ficam disponíveis somente no próprio cadastro. As consultas da interface ocultam suas unidades, pessoas e registros vinculados. Uma unidade inativa também oculta suas subordinadas, inclusive as que mantêm `ativo = true`.

O filtro de pessoas considera as lotações vigentes. Uma lotação já encerrada em unidade inativa não oculta uma pessoa transferida. O status individual da pessoa continua sendo um filtro independente.

Nenhum vínculo é apagado nem tem seu status alterado por essa regra. Reativar o cadastro superior permite que os vínculos válidos reapareçam. A sincronização SARH preserva organizações já inativadas no SECP; a reativação deve ser feita no cadastro.

## Consultas

- `prismaListagem`, em `src/shared/infrastructure/database/prisma-listagem.ts`, aplica a regra antes de filtrar, ordenar, paginar, agrupar e contar. Relações carregadas e suas contagens também são filtradas.
- `prismaCadastroOrganizacional` permite consultar o próprio órgão/unidade inativo para reativação. Continua ocultando os vínculos subordinados. Unidades de órgãos inativos e unidades subordinadas a uma unidade inativa não aparecem nesse cadastro até a reativação do superior.
- O cliente original `prisma` atende autenticação, integridade cadastral, gravações e processamento de integrações. Não deve ser usado para introduzir novas listagens da interface.

A consulta recursiva das unidades ocultas usa `UNION` para encerrar mesmo diante de ciclos de hierarquia. O contexto é compartilhado apenas durante a renderização React, sem cache global de status. Alterar status ou hierarquia invalida o cache das telas.

## Manutenção e validação

Após alterar relações no schema, execute:

```sh
node scripts/gerar-mapa-visibilidade-organizacional.mjs
npx vitest run src/shared/infrastructure/database/visibilidade-organizacional.test.ts src/modules/integracoes/sarh/application/status-organizacional-local.test.ts
```

O teste verifica se o mapa corresponde ao schema. A alteração não exige migrations nem seeds.
