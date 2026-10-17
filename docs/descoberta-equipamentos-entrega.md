# Entrega da descoberta de equipamentos — 17/10/2026

## A. Implementação

Foi acrescentado um módulo de descoberta ao Next.js existente, um serviço FastAPI independente e agentes Python de saída. Equipamentos e operações atuais continuam nas mesmas telas e usam os mesmos serviços de negócio. Não há migração de tecnologia nem segundo cadastro de equipamentos.

O administrador pode autorizar redes, inscrever/aprovar/revogar agentes, iniciar e cancelar jobs, acompanhar contadores reais, consultar evidências/histórico e cadastrar resultados individualmente ou em lote. Os cadastros nascem inativos para revisão. IP/MAC conflitantes não sobrescrevem equipamentos existentes.

## B. Arquitetura

```text
SECP Next.js — sessão/permissões/órgãos e unidades ativos
  └─ BFF /api/descoberta-equipamentos
       └─ API administrativa FastAPI v1, HMAC/timestamp/nonce/escopo
            ├─ SQLAlchemy/Alembic: fila SQL, leases, observações e auditoria
            ├─ worker independente: deadlines, recuperação e retenção
            ├─ Redis opcional: heartbeat/notificação de atualizações
            └─ agentes HTTPS de saída, tokens individuais e aprovação
                 └─ redes explícitas no central E no arquivo local
                      └─ TCP/ARP/ICMP/multicast/SNMP GET/adaptadores HTTP
```

Em produção, o central exige TLS, e o agente valida o certificado; em desenvolvimento, HTTP exige configuração explícita. Tokens do central são armazenados como hashes; no agente Windows, configuração/token foram protegidos com DPAPI. O agente não recebe comandos de shell.

PostgreSQL é indicado para concorrência de produção; SQLite WAL atende a instalação local. A proteção antirreplay usa transações curtas próprias, fora do event loop. Admissões de jobs são serializadas por órgão para respeitar a fila mesmo sob requisições concorrentes. Origens de requisição, CIDRs, portas, hosts, intensidade, janelas e escopos são validados no backend e novamente pelo agente.

## C. Arquivos principais

| Caminho | Responsabilidade |
|---|---|
| `docs/descoberta-equipamentos-auditoria.md` | Auditoria realizada antes da implementação e decisões de integração |
| `services/device-discovery/discovery/central.py` | API, orquestração, agentes, jobs, recebimento idempotente e métricas |
| `services/device-discovery/discovery/agent.py` | Processo independente, DPAPI/arquivos privados, outbox e reconexão |
| `services/device-discovery/discovery/scanner.py` | Motor real de rede, limites e cancelamento |
| `services/device-discovery/discovery/adapters.py` | Control iD, ISAPI, Intelbras e evidências de reconhecimento |
| `services/device-discovery/discovery/local_network.py` | Interfaces, ARP, ICMP e protocolos UDP de descoberta/leitura |
| `services/device-discovery/migrations/versions/0001_discovery.py` | Snapshot imutável do schema exclusivo de descoberta |
| `services/device-discovery/README.md` | Instalação, segurança, protocolos, diagnóstico e operação |
| `services/device-discovery/compose*.yaml`, `Dockerfile*` | Central/worker/agente com ciclos de vida separados |
| `services/device-discovery/install-agent-linux.sh`, `*.service`, `windows-service.example.xml` | Distribuição Linux e orientação Windows |
| `src/modules/descoberta/` | Gateway, contratos, conciliação, cadastro assistido e console |
| `src/app/api/descoberta-equipamentos/route.ts` | BFF autenticado, sem exposição do segredo ao navegador |
| `scripts/discovery-ui-check.mjs` | Verificação reproduzível de interface, restrita a localhost |

Foram atualizados o cabeçalho de Equipamentos e o catálogo/sidebar/presets de menu. Nenhuma migration Prisma nem seed do banco existente é necessário.

## D. Interface e rotas

- `/equipamentos/descoberta`: resultados, histórico paginado, agentes e redes; filtros pesquisáveis, ordenação e seleção de até 20 resultados.
- `/equipamentos/descoberta/instalacao`: instruções dentro do SECP.
- `/api/descoberta-equipamentos`: consulta e comandos autenticados do navegador.
- Central: `/api/v1/networks`, `/api/v1/agents`, `/api/v1/jobs`, `/api/v1/devices`, `/api/v1/audit`, `/api/v1/metrics`.
- Agentes: `/agent/v1/enroll`, `heartbeat`, `claim`, `rotate`, `jobs/{id}/lease`, `jobs/{id}/report`.
- Saúde/OpenAPI: `/health/live`, `/health/ready`, `/docs`.

O drawer mostra dados disponíveis, evidências declaradas/inferidas, horários, portas/protocolos e vínculo com cadastro existente. Ausências são indicadas como indisponíveis. Os filtros textuais de resultados operam sobre a página consultada, indicado na própria tela. Contadores de identificação/cadastro também informam que se referem à página. O cadastro reaproveita a action atual e sua auditoria; o teste utiliza a fábrica de drivers já existente.

## E. Fabricantes e limites

| Fabricante | Implementado | Validação/limite |
|---|---|---|
| Control iD acesso | Login autorizado + `system_information.fcgi` | Validado fisicamente no `172.19.5.29`: serial, firmware e MAC. Modelo não informado nessa consulta |
| Control iD iDClass | Perfil explícito + `get_about.fcgi` | Parser implementado; não testado em iDClass físico nesta entrega |
| Hikvision | ISAPI `deviceInfo`, XML seguro/Digest | Testes com simulador; sem homologação física ou SDK SADP |
| Intelbras Bio-T | Perfil explícito, Digest e leitura de serial | Requer credenciais/modelo compatível; sem validação física nesta entrega |
| Henry/Dimep | Indícios HTTP e teste com drivers existentes | Não confirma fabricante/modelo somente por porta; sem novo SDK binário de descoberta |
| ZKTeco | Reconhecimento provável por evidências HTTP e estrutura extensível | Não homologado; SDK/protocolo específico continua dependente de modelo/documentação/hardware |

ARP/multicast dependem da interface/VLAN; SNMP requer comunidade autorizada e faz somente GET sysDescr.0. Não são seguidas URLs externas anunciadas por dispositivos. IPv6 não foi implementado: os alvos são IPv4 privados literais.

## F. Instalação

Na pasta `services/device-discovery`, copie `.env.example` para `.env`, gere o segredo, configure banco próprio/TLS e execute:

```bash
docker compose --profile tools run --rm migrate
docker compose up -d --build central worker
```

Configure `DISCOVERY_SERVICE_URL` e `DISCOVERY_GATEWAY_SECRET` somente no backend Next.js. Não exponha o segredo como `NEXT_PUBLIC_*`.

Agente Docker/Linux:

```bash
# Primeiro revise agent.json, redes e os mounts privados.
DISCOVERY_AGENT_CONFIG=/caminho/agent.json docker compose -f compose.agent.yaml up -d --build
# Ou use install-agent-linux.sh e a unidade systemd incluída.
```

O bootstrap é gerado no SECP, dura 15 minutos e é seguido de aprovação administrativa. O guia detalha credenciais, CA, rotação/revogação, atualização, remoção, systemd e Windows/WinSW. Não se pressupõe acesso a broadcast pela rede bridge do Docker. O Compose usa subnet configurável e explícita, para evitar sobreposição com a rede institucional.

## G. Verificações executadas

| Verificação | Resultado |
|---|---|
| Ruff | Aprovado |
| ESLint das alterações | Aprovado |
| Python com SQLite | 35 aprovados; teste exclusivo de concorrência PostgreSQL corretamente ignorado |
| Python com PostgreSQL isolado | 36 aprovados, incluindo claims/reports simultâneos e limite de fila |
| Vitest: descoberta, BFF e regressão de menus | 30 aprovados |
| Next.js 16.2.6, build otimizado e TypeScript | Aprovados no Ubuntu; imagem carregada para validação local |
| Alembic em SQLite e PostgreSQL novos/isolados | Upgrade e comparação do schema aprovados |
| Central + worker Docker | Ambos com health checks aprovados |
| Redis real | Heartbeat do worker confirmado |
| HTTPS real | Health check com CA válida aprovado; certificado não confiável recusado |
| Agente Windows independente | Inscrição/aprovação, heartbeat, job e persistência reais aprovados |
| Fluxo TCP com simulador de testes | Aprovado, incluindo confirmação perdida/outbox/reenvio sem duplicação |
| Interface Playwright | Abertura autenticada, filtros, vazio/erro, detalhes, seleção, histórico/agentes/redes, job/progresso/cancelamento, mobile e bloqueio anônimo aprovados |
| Cadastro assistido real | Action/Prisma/Redis executados no desenvolvimento; equipamento criado inativo e removido após a conferência |
| Hardware `172.19.5.29` | Descoberta confirmada em aproximadamente 6,6 s no primeiro job; teste pelo driver atual retornou ONLINE |

Os testes Python emitiram uma depreciação do TestClient/HTTPX na versão instalada; os testes passaram. O Dockerfile Node já existente emite avisos sobre `ARG/ENV` de autenticação no build; foram usados placeholders de desenvolvimento no build remoto. Nenhum segredo produtivo foi inserido nos artefatos novos.

O cadastro de produção foi consultado em transação de leitura para confirmar que `172.19.5.29` pertence à SJAM. O vínculo da validação local foi corrigido com preservação do histórico. Nenhuma configuração do relógio foi alterada, e nenhuma marcação, imagem ou template foi coletado pelo novo serviço.

## H. Limitações e produção

- Esta entrega não instala a nova infraestrutura em produção nem modifica seu banco/configurações de equipamentos.
- A implantação produtiva exige definir endereço/CA/certificado, banco exclusivo, firewall e o host de cada agente. O guia já inclui esses procedimentos.
- Outros modelos, SDKs proprietários, SADP, SNMP/multicast em cada VLAN e execução do wrapper Windows precisam de validação própria. Não são declarados homologados pelos testes com simuladores.
- Testes dos drivers Node partem do servidor SECP; redes alcançadas somente por agente remoto podem permitir descoberta e impedir esse teste direto.
- A API de descoberta recebe escopos assinados do Next.js. As restrições de órgãos/unidades ativos são aplicadas nesse acesso; os agentes continuam limitados às redes explicitamente aprovadas e à allowlist local.

## I. Primeiro uso

1. Abra **Equipamentos → Descoberta de equipamentos** e selecione a seccional ativa.
2. Autorize o `/32` de um relógio conhecido e configure/aprove um agente com rota até ele.
3. Forneça credenciais de leitura ao agente somente quando o protocolo exigir.
4. Inicie **Nova descoberta → Endereço IP individual**. Confira contadores reais e abra **Detalhes**.
5. Revise evidências, serial, MAC e o driver; execute o teste de comunicação quando disponível.
6. Cadastre individualmente ou selecione resultados para lote. Confira o relatório por item.
7. Revise o equipamento inativo no cadastro existente antes de habilitar sua coleta.

Em desenvolvimento foi deixado um agente restrito a `172.19.5.29/32`, porta 80, com baixa intensidade, para testar esse fluxo na SJAM. Nenhuma outra faixa é varrida automaticamente.
