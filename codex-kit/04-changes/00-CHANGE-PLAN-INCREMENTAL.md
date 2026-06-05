# 00 — Plano Incremental de Changes para o SECP

## Como usar
Cada change deve ser executada isoladamente no Codex. Não misture changes na mesma solicitação.

## Change 01 — Consolidar DataTable/Listagens
- Criar componentes genéricos de listagem.
- Aplicar em Servidores e Unidades.
- Criar CSV/PDF genéricos ou helpers.
- Validar filtros por coluna e debounce.

## Change 02 — Consolidar PageHeader/RegraPortariaCard
- Garantir uso de PageHeader em páginas principais.
- RegraPortariaCard como ícone popup ao lado do título.
- Remover cards normativos grandes repetitivos.

## Change 03 — CPF em Usuario e Servidor
- Adicionar CPF em Usuario.
- Garantir sincronização Usuario/Servidor em criar/editar/sincronizar SARH.
- Ajustar validações de unicidade.

## Change 04 — Reprocessamento de marcações brutas
- Ao criar/editar servidor com CPF/matrícula, reprocessar pendentes.
- Garantir auditoria.

## Change 05 — Registro Web/Facial
- Web e facial por permissão.
- Primeira marcação do dia via web exige facial, se regra estiver ativa.
- Criar autorização facial temporária.
- Criar marcação bruta e processar.

## Change 06 — Recesso Forense — Modelagem
- Criar models Prisma e permissões.
- Criar seeds.
- Criar repositories.

## Change 07 — Recesso Forense — Telas Admin
- Cadastro de recesso.
- Portaria de convocação.
- Convocados por dia.
- Chefia responsável.

## Change 08 — Recesso Forense — Fluxo Servidor/Chefia/SECAD
- Espelho de recesso.
- Escolha pecúnia/folga.
- Fechamento servidor.
- Homologação chefia.
- Aceite SECAD.

## Change 09 — Relatórios Recesso
- Relatório SEPAG pecúnia.
- Relatório SECAP folgas.
- CSV/PDF.

## Change 10 — Testes
- Testes de cálculo ordinário.
- Testes de recesso.
- Testes de RBAC.
- Testes de AFD.
