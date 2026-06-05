# Skill 05 — Especialista em Banco de Horas

## Objetivo
Implementar cálculo de jornada, crédito, débito, saldo, limites e compensações.

## Entradas
- Marcações do dia.
- Jornada vigente.
- Ocorrências/afastamentos.
- Autorizações/compensações.

## Saídas
- Apuração diária.
- Movimento de banco.
- Saldo mensal.
- Alertas de limite/prazo.
- Recalculo.

## Regras
- Jornada 7h ou 8h.
- Intervalo de 1h a 3h quando aplicável.
- Limite ordinário de 16h crédito/mês.
- Compensação até 3 meses.
- Crédito/débito dependem de autorização quando aplicável.

## Checklist
- [ ] Dia sem jornada não calcula indevidamente.
- [ ] Período homologado bloqueia alteração.
- [ ] Recesso não contamina ordinário.
- [ ] Auditoria do recálculo.

## Prompt operacional
Implemente/revise o cálculo de banco de horas abaixo, respeitando jornada, marcações, autorizações, limite mensal e prazo de compensação.
