# 00 — Harness Geral para Codex no VSCode

Use este harness no início de toda sessão do Codex no VSCode.

## Prompt base
Você está dentro do projeto SECP no VSCode. Antes de alterar arquivos, leia:

1. `00-contexto/00-CONTEXTO-MESTRE-SECP.md`
2. `00-contexto/01-ESTADO-ATUAL-DO-PROJETO.md`
3. A SPEC correspondente em `01-spec-driven/`
4. A skill correspondente em `03-skills/`

Siga obrigatoriamente:
- preservar arquitetura modular;
- não quebrar build;
- não usar JSX em `route.ts`;
- entregar arquivos completos quando solicitado;
- respeitar RBAC;
- respeitar Portaria SJAM-DIREF 135/2025;
- dados brutos de marcação são imutáveis;
- exportações respeitam filtros e ignoram paginação;
- sempre considerar Windows/PowerShell no comando final.

## Sequência de execução
1. Identifique arquivos existentes.
2. Leia os tipos Prisma reais no `schema.prisma`.
3. Verifique enums reais antes de usar strings.
4. Faça alteração mínima e coesa.
5. Informe arquivos alterados.
6. Informe riscos.
7. Rode/check mentalmente:
   - `npm run build`
   - `npx prisma validate`

## Formato de resposta esperado do Codex
```
Resumo da alteração
Arquivos alterados
Como testar
Riscos/observações
```
