# 18 — Spec: Listagens, filtros e exportação

## Objetivo

Padronizar todas as telas de listagem do SECP com busca, filtros, paginação, seleção de itens por página, skeleton, estado vazio e exportação PDF.

## Escopo

- `DataTable`.
- `FilterBar`.
- `SearchInputDebounced`.
- `ItemsPerPageSelector`.
- `Pagination`.
- `ExportPdfButton`.
- Estado vazio orientado.
- Skeleton.

## Padrão visual

Topo direito:

```txt
[Exportar PDF]
```

Topo esquerdo:

```txt
[Buscar...] [Status] [Período] [Unidade] [Itens por página]
```

## Exportação PDF

Nesta etapa, o botão pode apenas chamar callback ou abrir modal de configuração.

Configurações futuras:

- A4 retrato.
- A4 paisagem.
- Colunas visíveis.
- Cabeçalho institucional.

## Critérios de aceite

- Toda listagem usa o mesmo padrão.
- Busca com debounce visual.
- Selects aplicam filtro imediatamente.
- Paginação clara.
- Exportar PDF visível no topo direito.
- Estado vazio orienta o usuário.

## Prompt operacional

```txt
Implemente a SPEC 18: listagens, filtros e exportação.
Crie componentes genéricos reutilizáveis.
Use dados mockados para demonstrar a DataTable.
Não implemente geração real do PDF nesta etapa.
```
