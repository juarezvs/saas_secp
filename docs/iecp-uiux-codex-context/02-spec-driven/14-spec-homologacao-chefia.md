# 14 — Spec: Homologação pela chefia

## Objetivo

Criar a experiência da chefia para analisar pendências, solicitações e homologar frequência mensal da equipe.

## Escopo

- Página `homologacao`.
- `HomologacaoQueue`.
- `ServidorFrequenciaReview`.
- `ApprovalFlow`.
- `DeadlineAlert`.
- `PortariaRuleCard`.

## Layout

Painel superior:

- Servidores da unidade.
- Regulares.
- Pendentes.
- Críticos.
- Homologados.

Fila:

- Críticos.
- Pendentes.
- Regulares.
- Homologados.

Detalhe do servidor:

- Comparecimentos.
- Ausências.
- Horas-débito.
- Horas-crédito.
- Solicitações.
- Histórico.
- Decisão.

## Decisões

- Aprovar solicitação.
- Indeferir solicitação.
- Devolver ao servidor.
- Homologar frequência.
- Bloquear por pendência crítica.

## Critérios de aceite

- Chefia vê prioridade de análise.
- Prazo do 2º dia útil aparece em destaque.
- Boletim até dia 10 aparece em orientação.
- Decisões são visualmente claras.
- UI registra que haverá auditoria.

## Prompt operacional

```txt
Implemente a SPEC 14: homologação pela chefia.
Use dados mockados e componentes existentes.
Não implemente persistência.
Crie fila de decisão e tela de revisão de servidor.
```
