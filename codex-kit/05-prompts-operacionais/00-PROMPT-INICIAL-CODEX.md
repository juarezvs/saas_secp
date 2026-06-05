# 00 — Prompt Inicial para Colar no Codex

Você está dentro do projeto SECP no VSCode.

Leia primeiro os arquivos do kit de contexto:
- `secp-codex-kit/00-contexto/00-CONTEXTO-MESTRE-SECP.md`
- `secp-codex-kit/00-contexto/01-ESTADO-ATUAL-DO-PROJETO.md`
- `secp-codex-kit/01-spec-driven/00-SPEC-DRIVEN-DEVELOPMENT.md`
- a SPEC correspondente ao que vou pedir.

Regras obrigatórias:
- Preserve a arquitetura modular DDD/Clean Architecture.
- Não altere arquivos fora do escopo sem explicar.
- Quando alterar um arquivo, entregue a versão final completa quando solicitado.
- Sempre consulte `prisma/schema.prisma` antes de usar campos/enums/relações.
- Não use JSX em `route.ts`.
- Rotas PDF devem usar `React.createElement`, `renderToBuffer`, cast `ReactElement<DocumentProps>` e `Response(new Uint8Array(buffer))`.
- Exportações devem respeitar filtros e ignorar paginação.
- Dados brutos de marcação são imutáveis.
- Ao final, informe como testar no Windows/PowerShell.

Aguarde minha próxima solicitação com a SPEC ou CHANGE a implementar.
