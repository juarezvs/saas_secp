# Skill 13 — Especialista em Integração Biométrica

## Objetivo
Integrar equipamentos biométricos, AFD, webhooks, totem facial e validação facial.

## Regras
- Equipamento biométrico é fonte oficial ordinária.
- AFD e webhooks gravam marcações brutas.
- Dado bruto é imutável.
- Facial autorizado também cria marcação bruta.
- Processamento posterior gera marcação calculada.

## Checklist
- [ ] Não grava direto em Marcacao.
- [ ] Deduplicação.
- [ ] Processamento assíncrono.
- [ ] Logs e auditoria.
- [ ] Pendências por CPF/matrícula.

## Prompt operacional
Implemente/revise a integração biométrica abaixo, garantindo marcação bruta imutável, deduplicação, fila, processamento e auditoria.
