# 04 — Harness Recesso Forense

## Prompt operacional
Implemente o módulo Recesso Forense como bounded context separado. Não misture cálculo ordinário de frequência com recesso.

## Regras
- Período anual: 20/12 a 06/01.
- Convocação por servidor e por dia.
- Servidor não convocado não pode receber falta/débito.
- Espelho ordinário deve mostrar “Recesso Forense” nos dias de recesso em que não houve convocação.
- Espelho de recesso próprio.
- Fechamentos separados: dezembro e janeiro.
- Escolha por dia: pecúnia ou folga.
- Chefia responsável do recesso pode ser diferente da chefia ordinária.
- Fluxo: servidor fecha → chefia homologa → SECAD aceita → relatórios SEPAG/SECAP.

## Critérios de aceite
- [ ] Modelos Prisma criados.
- [ ] Permissões RBAC criadas.
- [ ] Páginas por perfil criadas.
- [ ] Auditoria em todas as transições.
- [ ] Relatórios PDF/CSV.
