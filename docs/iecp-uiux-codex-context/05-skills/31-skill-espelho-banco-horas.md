# 31 — Skill: Espelho e Banco de Horas

## Objetivo

Criar telas de consulta do espelho de ponto e acompanhamento de banco de horas.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 13.
- DataTable.
- StatusBadge.

## Saídas obrigatórias

- EspelhoPontoTable.
- BancoHorasSummaryCard.
- BancoHorasExtrato.
- Filtros e exportação visual.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Colunas mínimas.
- [ ] Badges de situação.
- [ ] Busca/filtros/paginação.
- [ ] Exportar PDF no topo direito.

## Exemplo de prompt operacional

```txt
Implemente espelho e banco de horas conforme Skill 31 e Spec 13. Use dados mockados.
```
