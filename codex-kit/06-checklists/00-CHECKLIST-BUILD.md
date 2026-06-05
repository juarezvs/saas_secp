# 00 — Checklist de Build

Antes de considerar concluído:

```powershell
npx prisma validate
npm run build
```

## Verificações manuais
- [ ] Imports existem.
- [ ] Enums usados existem no schema.
- [ ] Relações Prisma existem.
- [ ] Não há JSX em `route.ts`.
- [ ] Response PDF usa `Uint8Array`.
- [ ] Client Component não importa Prisma/server actions indevidamente.
- [ ] Server Component não usa hooks client.
