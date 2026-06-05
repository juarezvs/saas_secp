# SPEC 01 — Padrão Genérico de Listagens

## Objetivo
Criar e aplicar um padrão reutilizável para todas as páginas de listagem do SECP.

## Contexto funcional
As listagens devem permitir consulta, filtros por coluna, paginação, itens por página e exportações CSV/PDF. A exportação deve considerar os filtros ativos e todos os registros filtrados, não apenas a página atual.

## Regras obrigatórias
1. Filtros ficam dentro do cabeçalho/área superior da própria tabela.
2. Selects aplicam imediatamente ao alterar.
3. Inputs de texto aplicam com debounce de 3 segundos.
4. Campo de busca geral pesquisa pelos campos visíveis da tabela.
5. Itens por página faz parte da tabela.
6. Exportar lista e Exportar PDF ficam no topo direito da tabela.
7. Exportação ignora paginação, mas respeita filtros.
8. Componentização obrigatória.

## Arquivos/componentes recomendados
```
src/components/listagens/
  data-table-shell.tsx
  data-table-toolbar.tsx
  data-table-pagination.tsx
  data-table-page-size.tsx
  data-table-export-buttons.tsx
  filtro-texto-debounce.tsx
  filtro-select-imediato.tsx
```

## Critérios de aceite
- [ ] Ao digitar no filtro texto, URL só muda após 3 segundos.
- [ ] Ao selecionar filtro select, URL muda imediatamente.
- [ ] Paginação preserva filtros.
- [ ] Itens por página reseta para página 1.
- [ ] Export CSV respeita filtros.
- [ ] Export PDF respeita filtros.
- [ ] `npm run build` passa.

## Restrições
- Não usar estado global para filtros.
- Usar query string como fonte de verdade.
- Server Component carrega dados paginados.
- Client Component controla filtros e navegação.
