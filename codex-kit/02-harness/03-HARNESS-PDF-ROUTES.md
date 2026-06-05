# 03 — Harness para Rotas PDF no Next.js

## Regra obrigatória
Rotas API do App Router devem permanecer como:
```
route.ts
```
Não usar JSX em `route.ts`.

## Padrão obrigatório
```ts
import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

const documento = React.createElement(PdfDocument, props) as ReactElement<DocumentProps>;
const buffer = await renderToBuffer(documento);

return new Response(new Uint8Array(buffer), {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="arquivo.pdf"`,
    "Cache-Control": "no-store",
  },
});
```

## Checklist
- [ ] `route.ts` sem JSX.
- [ ] `runtime = "nodejs"`.
- [ ] Permissões verificadas.
- [ ] Filtros aplicados.
- [ ] Exportação ignora paginação.
- [ ] Response usa `Uint8Array`.
