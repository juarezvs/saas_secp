# Observabilidade do SECP

Esta estrutura prepara Prometheus, Grafana, Alertmanager e exporters para o SECP sem alterar regras funcionais da aplicacao. A ativacao em producao deve ser feita em etapas e somente depois do preflight.

## Arquitetura

- Aplicacao SECP: expoe `/api/health`, `/api/ready` e `/api/metrics`.
- Prometheus: coleta app, node_exporter, cAdvisor, PostgreSQL, Redis, Grafana, Alertmanager, Tempo, Loki, Promtail e blackbox.
- Grafana: dashboards e datasources provisionados por arquivo, sem usuario anonimo e sem signup.
- Tempo: recebe traces OpenTelemetry via OTLP HTTP/gRPC.
- Loki + Promtail: coletam logs JSON dos containers Docker.
- Alertmanager: envia alertas para webhook real configurado via secret.
- Exporters: sem portas publicas. Grafana e Prometheus tem bind parametrizado.

## Seguranca

- `/api/metrics` exige `Authorization: Bearer <token>`.
- O token pode vir de `SECP_METRICS_TOKEN` ou `SECP_METRICS_TOKEN_FILE`.
- Nao use dados pessoais em labels de metricas.
- A stack de observabilidade usa secrets via arquivos em `observability/secrets/`, ignorados pelo Git.
- Alertmanager nao publica porta no host.
- O Grafana usa senha de admin via secret e fica em `127.0.0.1:${GRAFANA_BIND_PORT}` por padrao.
- O Prometheus fica em `127.0.0.1:${PROMETHEUS_BIND_PORT}` por padrao.
- Logs estruturados mascaram campos sensiveis comuns como token, senha, cookie, CPF, matricula e biometria.

## Preflight em producao

No host Ubuntu:

```bash
cd /caminho/do/secp
bash scripts/observability/preflight.sh
```

Resultados possiveis:

- `APTO`: pode seguir para a validacao.
- `APTO COM RESSALVAS`: leia as ressalvas e corrija ou aceite conscientemente.
- `NAO RECOMENDADO`: nao suba a stack antes de corrigir.

Se `/srv/observability` estiver no mesmo filesystem da raiz, o script gera ressalva. Continue apenas se aceitar o risco:

```bash
ALLOW_SHARED_ROOT_FS=true bash scripts/observability/preflight.sh
```

## Preparacao

```bash
cd observability
cp .env.example .env
mkdir -p secrets
openssl rand -hex 32 > secrets/secp_metrics_token
openssl rand -base64 32 > secrets/grafana_admin_password
printf 'https://SEU-WEBHOOK-ALERTMANAGER.example/secp\n' > secrets/alertmanager_webhook_url
```

Crie o usuario de monitoramento no PostgreSQL ajustando banco e senha:

```bash
psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f postgres/create-monitoring-role.sql
```

Depois crie `secrets/postgres_exporter_dsn`:

```text
postgresql://secp_monitor:SENHA@secp-postgres:5432/NOME_DO_BANCO?sslmode=disable
```

Configure a aplicacao SECP com o mesmo token de metricas. Opcoes:

```bash
SECP_METRICS_TOKEN="$(cat observability/secrets/secp_metrics_token)"
```

ou:

```bash
SECP_METRICS_TOKEN_FILE=/run/secrets/secp_metrics_token
```

No Docker de producao, `compose.prod.yaml` ja monta `/run/secrets/secp_metrics_token`.
Para traces, a aplicacao usa por padrao:

```bash
OTEL_ENABLED=true
OTEL_SERVICE_NAME=secp-web
OTEL_EXPORTER_OTLP_ENDPOINT=http://secp-observability-tempo:4318
LOG_LEVEL=info
```

## Validacao

```bash
cd observability
bash scripts/validate.sh
```

O script valida:

- `docker compose config`
- configuracao do Prometheus com `promtool`
- configuracao do Alertmanager com `amtool`

## Subida controlada

```bash
cd observability
bash scripts/start.sh
bash scripts/status.sh
```

O Grafana fica em `http://127.0.0.1:3100/` por padrao. A porta 3001 ja e usada pelo SECP em producao, por isso o default local e 3100.

Para acessar do navegador de outra maquina da rede, configure os binds no `.env` da observabilidade:

```bash
GRAFANA_BIND_ADDRESS=0.0.0.0
GRAFANA_BIND_PORT=3100
GRAFANA_ROOT_URL=http://IP-OU-DNS-DO-SERVIDOR:3100/
PROMETHEUS_BIND_ADDRESS=0.0.0.0
PROMETHEUS_BIND_PORT=9090
```

Com isso, acesse `http://IP-OU-DNS-DO-SERVIDOR:3100/` para Grafana e `http://IP-OU-DNS-DO-SERVIDOR:9090/` para Prometheus.

No Grafana:

- Prometheus: metricas e alertas.
- Tempo: traces de requisicoes e auto-instrumentacao Node.
- Loki: logs estruturados dos containers, correlacionaveis por `traceId`.

## Caddy ou proxy reverso

Nao altere Caddy sem backup, validacao e plano de rollback. Exemplo de bloco para uma etapa futura:

```caddyfile
grafana-secp.am.trf1.gov.br {
  reverse_proxy 127.0.0.1:3100
}
```

Antes de aplicar:

```bash
caddy validate --config /etc/caddy/Caddyfile
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.$(date +%Y%m%d%H%M%S)
systemctl reload caddy
```

## Metricas implementadas

- `secp_build_info`
- `secp_process_uptime_seconds`
- `secp_http_requests_total`
- `secp_http_request_duration_seconds`
- `secp_http_requests_in_flight`
- `secp_http_response_size_bytes`
- `secp_application_errors_total`
- `secp_active_sessions`
- `secp_business_events_total`
- `secp_queue_jobs`
- `secp_queue_healthy`

`secp_active_sessions` e metricas de negocio especificas, como homologacao, banco de horas, importacoes e dispositivos biometricos, ainda precisam ser ligadas a eventos reais do dominio. Elas nao devem ser inventadas por consulta cara ou labels com dados pessoais.

## Limites atuais

- As metricas HTTP cobrem rotas instrumentadas com `withHttpMetrics`; rotas criticas de auth, health, readiness, metrics, AFD, SARH, biometria, Teams, webhooks, exports, relatorios, sessao e reprocessamento global ja estao cobertas.
- A coleta de filas tem timeout curto para nao travar scrape.
- O Alertmanager depende de `observability/secrets/alertmanager_webhook_url`; sem esse arquivo a stack nao deve ser iniciada.
- Grafana usa SQLite local, suficiente para inicio; migre para banco dedicado se houver muitos usuarios ou alta criticidade operacional.
- Tracing so e exportado quando `OTEL_ENABLED=true` ou `OTEL_EXPORTER_OTLP_ENDPOINT` estiver configurado.
