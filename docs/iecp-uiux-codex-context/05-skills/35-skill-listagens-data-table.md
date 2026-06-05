# 35 — Skill: Listagens DataTable

## Objetivo

Criar padrão único de tabelas, filtros, busca, paginação e exportação PDF visual.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 18.
- Componentes base.

## Saídas obrigatórias

- DataTable.
- FilterBar.
- SearchInputDebounced.
- Pagination.
- ExportPdfButton.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Busca com debounce.
- [ ] Selects aplicam filtro.
- [ ] Itens por página.
- [ ] Skeleton e empty state.

## Exemplo de prompt operacional

```txt
Implemente DataTable e filtros conforme Skill 35 e Spec 18. Use dados mockados.
```
