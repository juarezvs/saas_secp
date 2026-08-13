#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

test -f .env || {
  echo "Crie observability/.env a partir de .env.example antes de iniciar." >&2
  exit 1
}

mkdir -p \
  /srv/observability/prometheus \
  /srv/observability/grafana \
  /srv/observability/alertmanager \
  /srv/observability/tempo \
  /srv/observability/loki

for secret in \
  secrets/secp_metrics_token \
  secrets/grafana_admin_password \
  secrets/postgres_exporter_dsn \
  secrets/alertmanager_webhook_url
do
  if [[ -f "$secret" ]]; then
    chmod 0644 "$secret"
  fi
done

docker compose --env-file .env -f compose.observability.yaml up -d
