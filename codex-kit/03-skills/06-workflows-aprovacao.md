# Skill 06 — Especialista em Workflows de Aprovação

## Objetivo
Modelar solicitações, aprovações, indeferimentos, comprovantes, timelines e stepper.

## Entradas
- Tipo de solicitação.
- Perfis envolvidos.
- Estados permitidos.

## Saídas
- State machine.
- Server actions.
- Timeline/auditoria.
- Comprovante.
- Stepper.

## Restrições
- Toda decisão de chefia deve ser auditada.
- Solicitação aprovada deve recalcular frequência/banco.
- Indeferimento deve exigir justificativa.

## Checklist
- [ ] Estados claros.
- [ ] Transições protegidas por permissão.
- [ ] Recalculo após aprovação.
- [ ] Comprovante gerado.

## Prompt operacional
Crie o workflow da solicitação abaixo com estados, permissões, actions, componentes, auditoria e critérios de aceite.
