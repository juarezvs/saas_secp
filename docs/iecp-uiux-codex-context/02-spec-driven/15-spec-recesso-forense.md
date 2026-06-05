# 15 — Spec: Recesso forense

## Objetivo

Criar o módulo visual de acompanhamento do recesso forense, separado do ponto ordinário.

## Escopo

- Página `recesso-forense`.
- `RecessoDashboard`.
- `RecessoPeriodoCard`.
- `ConvocadosTable`.
- `RecessoApprovalFlow`.
- Espelho de recesso.

## Fluxo visual

```txt
Servidor fecha período
→ Chefia homologa
→ SECAD aceita
→ SEPAG consolida pecúnia
→ SECAP consolida folgas
```

## Períodos

- Dezembro: 20/12 a 31/12.
- Janeiro: 01/01 a 06/01.

## Estados

- Não convocado.
- Convocado.
- Aguardando fechamento.
- Fechado pelo servidor.
- Homologado pela chefia.
- Aceito pela SECAD.
- Consolidado para SEPAG.
- Consolidado para SECAP.

## Regra visual

Dias não convocados devem exibir “Recesso forense”.

## Critérios de aceite

- Recesso não se mistura com frequência ordinária.
- Dezembro e janeiro aparecem separados.
- Chefia responsável aparece por servidor/período.
- Fluxo é compreensível.

## Prompt operacional

```txt
Implemente a SPEC 15: recesso forense.
Crie dashboard mockado e componentes de período, convocados e fluxo de aprovação.
Não implemente cálculo real de pecúnia ou folga.
```
