# CHANGE 02 — Recesso Forense: Modelagem

## Objetivo
Criar base de dados e estrutura inicial do módulo `recesso-forense`.

## Models sugeridos
- RecessoForense
- RecessoPortariaConvocacao
- RecessoConvocado
- RecessoConvocadoDia
- RecessoChefiaResponsavel
- RecessoFechamentoServidor
- RecessoHomologacaoChefia
- RecessoAceiteSecad

## Permissões sugeridas
- recesso:gerenciar:global
- recesso:consultar:global
- recesso:convocacao:gerenciar
- recesso:fechar:proprio
- recesso:homologar:chefia
- recesso:aceitar:secad
- recesso:relatorio:sepag
- recesso:relatorio:secap

## Critérios de aceite
- [ ] Prisma validate passa.
- [ ] Migration criada.
- [ ] Seed de permissões atualizado.
