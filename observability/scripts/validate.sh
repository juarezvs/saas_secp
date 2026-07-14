#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE=".env.example"
fi

docker compose --env-file "$ENV_FILE" -f compose.observability.yaml config >/tmp/secp-observability-compose.yaml

tmp_token="$(mktemp)"
tmp_webhook="$(mktemp)"
trap 'rm -f "$tmp_token" "$tmp_webhook"' EXIT
printf 'validation-token\n' > "$tmp_token"
printf 'https://alertmanager-webhook.example.local/secp\n' > "$tmp_webhook"

docker run --rm --entrypoint promtool \
  -v "$PWD/prometheus:/etc/prometheus:ro" \
  -v "$tmp_token:/run/secrets/secp_metrics_token:ro" \
  prom/prometheus:v2.55.1 \
  check config /etc/prometheus/prometheus.yml

docker run --rm --entrypoint amtool \
  -v "$PWD/alertmanager:/etc/alertmanager:ro" \
  -v "$tmp_webhook:/run/secrets/alertmanager_webhook_url:ro" \
  prom/alertmanager:v0.27.0 \
  check-config /etc/alertmanager/alertmanager.yml

echo "Validacao concluida."
