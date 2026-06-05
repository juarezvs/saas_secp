# CHANGE 01 — Listagens Genéricas

## Objetivo
Criar um padrão reaproveitável para listagens do SECP e aplicar em Servidores e Unidades.

## Escopo
- Componentes em `src/components/listagens`.
- Helpers de query string.
- Botões de exportação.
- Filtros texto com debounce de 3s.
- Filtros select imediatos.
- Itens por página dentro da tabela.
- Paginação server-side.

## Fora do escopo
- Refatorar todas as páginas do sistema de uma vez.
- Alterar regras de negócio.

## Critérios de aceite
- [ ] Servidores funcionando.
- [ ] Unidades funcionando.
- [ ] Export CSV e PDF funcionando.
- [ ] Build passa.
