# CHANGE 03 — Integração SARH

## Objetivo
Consolidar sincronização com SARH para órgãos, lotações, servidores, cargos e lotações de servidores.

## APIs conhecidas
- `/empresas` — seções judiciárias/órgãos.
- `/lotacao` — departamentos/unidades.
- `/servidores` — servidores.
- `/lotacao-servidor` — vínculo servidor-lotação.
- `/cargos` — cargos.

## Regras
- Normalizar CPF com 11 dígitos.
- Sincronizar Usuario e Servidor.
- Criar perfil SERVIDOR automaticamente.
- Criar jornada padrão 7h se inexistente.
- Não excluir dados ausentes; inativar quando necessário.
- Registrar auditoria/resumo da sincronização.

## Critérios de aceite
- [ ] Sincroniza sem duplicidade.
- [ ] CPF em Usuario e Servidor.
- [ ] Lotações ativas corretas.
- [ ] Logs claros.
