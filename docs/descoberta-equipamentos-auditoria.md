# Auditoria e decisões — descoberta de equipamentos

Auditoria em 17/10/2026, antes das alterações deste módulo.

## Aplicação existente

- Next.js 16.2.6, React 19.2.4, TypeScript 5, App Router (`src/app`).
- Tailwind 4, Radix UI, Lucide e componentes próprios em `src/components/ui`. Selects pesquisáveis já existem.
- Auth.js 5, sessão por perfil, permissões `integracoes:consultar:global` e `integracoes:gerenciar:global` (compatibilidade seccional existente), escopo em `obterEscopoOrgaoDaSessao`.
- PostgreSQL 18, Prisma 7.8, Redis 7 e BullMQ. Workers de coleta, Monitor Control iD, Henry online, processamento e relatórios são independentes.
- Órgãos e unidades pertencem ao domínio Prisma. `prismaListagem` aplica a visibilidade de organizações ativas e suas hierarquias.
- Cadastro único: `EquipamentoBiometrico`, relacionado a órgão, unidade e `IntegracaoSistema`. Código único; IP/MAC não são identidades estáveis.
- `/equipamentos`: `EquipamentosPageTabs` reúne a listagem e **Operações dos relógios de ponto**. Essas telas serão preservadas.
- Cadastro: `registrarEquipamentoBiometricoAction`, schema Zod existente, transação e auditoria `AuditoriaEvento`.
- Drivers: `criarRelogioPontoProvider`, implementações Henry ADV/Lumen/REP Web, Control iD acesso/iDClass, Dimep Smart Print e Intelbras Bio-T. Testes disponíveis em `testarConexao`.
- Deploy: Docker multi-stage Node 22, `compose.prod.yaml`, script PowerShell com backup e migrations sem reset. Vitest e Playwright; não há diretório `.github` de CI no checkout auditado.

## Arquitetura adotada

`services/device-discovery` contém FastAPI, worker de manutenção e agente Python. A aplicação Next.js comunica-se somente com a API administrativa, assinando cada requisição. Agentes fazem conexões de saída com credenciais próprias. Jobs são persistidos antes de serem disponibilizados aos agentes; leases e confirmações idempotentes permitem recuperação após falhas.

O serviço tem banco próprio (SQLite WAL para instalação local pequena; PostgreSQL para produção), tabelas prefixadas `discovery_` e migrations Alembic próprias. Não altera tabelas Prisma nem cria outro cadastro de equipamentos. Redis é um canal de notificação opcional; persistência e entrega não dependem de uma notificação sobreviver. O worker cuida de leases, deadlines e retenção; não faz sondagens dentro do processo Next.js.

Orgãos/unidades são validados pelo Next.js antes de cada operação. A API central reaplica o escopo assinado. Redes são aprovadas administrativamente e validadas novamente pelo agente contra seu arquivo local. CIDR/IP literais, limites de hosts, portas, tempo e taxa são obrigatórios. Não se seguem redirects, proxies de ambiente ou URLs anunciadas por SSDP/WS-Discovery.

Descoberta não modifica equipamentos, busca senhas, lê templates ou imagens. HTTP genérico fornece indícios; somente metadados estruturados de um protocolo específico podem confirmar identidade. Control iD, Hikvision ISAPI e Intelbras/Dahua possuem leitores de metadados; Henry e Dimep reutilizam os drivers Node para teste assistido. ZKTeco/SADP proprietários não são declarados compatíveis sem SDK/documentação/hardware demonstrados.

Cadastro assistido chama a action existente, usa código idempotente derivado da descoberta e bloqueia conflitos de identidade. IP/MAC produzem avisos, sem mesclar nem atualizar automaticamente equipamentos. Testes dos drivers existentes ficam separados da descoberta e não habilitam Monitor/coleta/configuração.

Falha do serviço gera estado de indisponibilidade somente na tela de descoberta. Saúde, login, ponto e coleta existentes não passam a depender deste serviço. Instalação de serviços em produção é uma operação própria, documentada; não faz parte de um reset/seed do SECP.

## Referências verificadas

- [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/).
- [Control iD — login](https://www.controlid.com.br/docs/access-api-pt/gerenciamento-secao/fazer-login/).
- [Control iD — API de acesso](https://www.controlid.com.br/docs/access-api-pt/).
- [HTTPX — redirecionamentos e interface](https://www.python-httpx.org/api/).
- [SQLAlchemy — sessões e transações](https://docs.sqlalchemy.org/en/20/orm/session_basics.html).
- [Hikvision — integração ISAPI e deviceInfo](https://www.hikvision.com/content/dam/hikvision/vn/webinar/Thang3_Hikvision_Tich_Hop_The_Thong_Overview-of-3rd-Party-Integration.pdf).
