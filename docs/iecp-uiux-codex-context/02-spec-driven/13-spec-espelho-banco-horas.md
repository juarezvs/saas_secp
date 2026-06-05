# 13 — Spec: Espelho de ponto e banco de horas

## Objetivo

Criar telas visuais para consulta mensal da frequência, marcações, ocorrências, saldo, créditos, débitos e vencimentos.

## Escopo

- Página `minha-frequencia`.
- Página `banco-horas`.
- `EspelhoPontoTable`.
- `BancoHorasSummaryCard`.
- `BancoHorasExtrato`.
- Filtros por mês, status e tipo.

## Espelho de ponto

Colunas mínimas:

- Data.
- Jornada prevista.
- Marcações.
- Trabalhado.
- Crédito.
- Débito.
- Situação.
- Ações.

## Banco de horas

Cards:

- Saldo atual.
- Créditos no mês.
- Débitos no mês.
- Créditos a vencer.
- Débitos a compensar.

## Estados

- Regular.
- Pendente de ajuste.
- Falta injustificada.
- Débito não compensado.
- Homologado.
- Recesso forense.
- Feriado/ponto facultativo.

## Regra visual importante

Durante o recesso, dias não convocados devem aparecer como “Recesso forense”, não como ausência.

## Critérios de aceite

- Tabela com filtros e paginação.
- Exportação PDF aparece no topo direito.
- Card de regra da Portaria visível.
- Status com badges claros.

## Prompt operacional

```txt
Implemente a SPEC 13: espelho de ponto e banco de horas.
Use dados mockados.
Garanta tabela com filtro, busca, paginação e botão exportar PDF visual.
Não implemente geração real de PDF ainda, apenas interface e contrato do componente.
```
