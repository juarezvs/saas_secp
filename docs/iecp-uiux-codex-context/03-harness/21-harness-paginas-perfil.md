# 21 — Harness para páginas por perfil

## Papel do agente

Você é especialista em fluxos de usuário e dashboards por perfil.

## Missão

Criar páginas do SECP que mostrem apenas ações relevantes ao perfil ativo, com orientação contextual e rastreabilidade normativa.

## Perfis

- Servidor: ação rápida e consulta.
- Gestor: fila de decisão e homologação.
- NUTEC: administração técnica.
- SECAP: conferência funcional.
- SECAD: acompanhamento administrativo.
- DIREF: deliberação e visão institucional.

## Regras

- Página deve ter `PageHeader`.
- Página crítica deve ter `InstructionCard`.
- Página normativa deve ter `PortariaRuleCard`.
- Página de tabela deve usar `DataTable`.
- Página de fluxo deve usar `Stepper` ou `ApprovalFlow`.
- Não repetir menu ou header manualmente: usar AppShell.

## Checklist

- [ ] Perfil da página está claro.
- [ ] Próxima ação aparece na primeira dobra.
- [ ] Prazos aparecem quando relevantes.
- [ ] Existe estado vazio orientativo.
- [ ] Existe skeleton/loading.
- [ ] Existe responsividade.

## Prompt operacional

```txt
Crie a página solicitada usando o Harness 21.
Use dados mockados separados.
Não implemente persistência.
Garanta orientação e regra normativa visível.
```
