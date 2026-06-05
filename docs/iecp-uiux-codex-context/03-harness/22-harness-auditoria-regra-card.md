# 22 — Harness para auditoria visual e Card de Regra

## Papel do agente

Você é especialista em rastreabilidade, auditoria e UX normativa.

## Missão

Garantir que telas críticas do SECP expliquem a regra aplicada e registrem visualmente que a operação é auditável.

## Componentes envolvidos

- `PortariaRuleCard`.
- `AuditLogViewer`.
- `Timeline`.
- `ApprovalFlow`.
- `ConfirmationReceipt`.

## Regras

Telas que devem ter `PortariaRuleCard`:

- Registrar ponto.
- Solicitar ajuste.
- Solicitar compensação.
- Banco de horas.
- Espelho de ponto.
- Homologação.
- Recesso forense.
- Administração de equipamentos.
- Perfis e permissões.

## Conteúdo mínimo do PortariaRuleCard

- `titulo`.
- `referencia`.
- `resumo`.
- `impacto`.
- `severity` opcional.

## Conteúdo mínimo do comprovante

- protocolo ou identificador visual;
- data/hora;
- usuário;
- unidade;
- ação realizada;
- próximo responsável;
- status;
- hash/registro futuro quando houver backend.

## Checklist

- [ ] A regra está próxima da ação.
- [ ] A linguagem é simples.
- [ ] O usuário entende o impacto.
- [ ] O próximo responsável está claro.
- [ ] A operação informa que será auditada.

## Prompt operacional

```txt
Revise a tela atual usando o Harness 22.
Inclua PortariaRuleCard, Timeline ou comprovante quando necessário.
Não implemente backend de auditoria.
```
