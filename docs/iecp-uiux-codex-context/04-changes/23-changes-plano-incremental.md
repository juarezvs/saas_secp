# 23 — Plano incremental de mudanças UI/UX

## Fase 0 — Preparação

Objetivo: organizar contexto e branch.

- Criar branch `feature/uiux-secp-layout`.
- Copiar pacote de contexto para `/docs/ia/secp-uiux-codex-context`.
- Abrir README e guia no VSCode.

## Fase 1 — Design System

Objetivo: estabelecer base visual.

- Tokens CSS/Tailwind.
- Button.
- Card.
- Badge.
- Input.
- Skeleton.
- StatusBadge.
- InstructionCard.
- PortariaRuleCard.

Commit sugerido:

```txt
feat(ui): adiciona design system base do SECP
```

## Fase 2 — AppShell

Objetivo: layout estrutural.

- AppShell.
- Header.
- Sidebar.
- Breadcrumb.
- ProfileSwitcher.
- AccessibilityToolbar.

Commit sugerido:

```txt
feat(ui): implementa appshell institucional do SECP
```

## Fase 3 — Dashboard Servidor

Objetivo: primeira experiência operacional.

- Dashboard servidor.
- Próxima ação.
- Marcações do dia.
- Alertas.
- Frequência do mês.
- Acesso rápido.

Commit sugerido:

```txt
feat(ui): cria dashboard auto-instrucional do servidor
```

## Fase 4 — Registro de ponto

Objetivo: fluxo de registro.

- Registrar ponto.
- Captura facial visual.
- Comprovante.
- Timeline.

Commit sugerido:

```txt
feat(ui): cria fluxo visual de registro de ponto
```

## Fase 5 — Solicitações

Objetivo: stepper genérico.

- Stepper.
- Solicitação de ajuste.
- Revisão.
- Comprovante.

Commit sugerido:

```txt
feat(ui): implementa fluxo guiado de solicitações
```

## Fase 6 — Espelho e banco

Objetivo: consulta e acompanhamento.

- Espelho.
- Banco de horas.
- Filtros.
- Exportação PDF visual.

Commit sugerido:

```txt
feat(ui): adiciona espelho e banco de horas visual
```

## Fase 7 — Homologação

Objetivo: fila de decisão da chefia.

- Painel da chefia.
- Fila de pendências.
- Revisão de servidor.
- Fluxo de aprovação.

Commit sugerido:

```txt
feat(ui): cria painel de homologação da chefia
```

## Fase 8 — Recesso forense

Objetivo: fluxo próprio de recesso.

- Dashboard do recesso.
- Convocados.
- Períodos dezembro/janeiro.
- Fluxo SECAD/SEPAG/SECAP.

Commit sugerido:

```txt
feat(ui): cria módulo visual de recesso forense
```

## Fase 9 — Landpage/Login

Objetivo: entrada institucional.

- Landpage.
- Login com matrícula.
- Mensagens de suporte.

Commit sugerido:

```txt
feat(ui): cria landpage e login institucional do SECP
```

## Fase 10 — Polimento

Objetivo: acessibilidade e responsividade.

- Alto contraste.
- Fonte dislexia.
- Responsividade fina.
- Revisão de aria.
- Testes visuais.

Commit sugerido:

```txt
refactor(ui): aprimora acessibilidade e responsividade
```
