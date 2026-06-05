# 01 — Harness para Listagens

## Objetivo
Aplicar o padrão de listagem em uma página específica.

## Prompt operacional
Analise a página de listagem informada e aplique o padrão SECP:
- filtros dentro da própria tabela;
- selects com aplicação imediata;
- textos com debounce de 3 segundos;
- campo de consulta geral pesquisando campos visíveis da tabela;
- itens por página dentro da tabela;
- paginação server-side;
- exportar lista CSV e exportar PDF no topo direito da tabela;
- exportação respeita todos os filtros e ignora paginação.

Preserve as regras de permissão existentes e o layout com PageHeader.
Entregue a versão final completa dos arquivos alterados.

## Checklist
- [ ] Query string é fonte de verdade.
- [ ] Paginação preserva filtros.
- [ ] Exportação preserva filtros.
- [ ] CSV usa BOM UTF-8.
- [ ] PDF usa `route.ts` sem JSX.
- [ ] `npm run build` passa.
