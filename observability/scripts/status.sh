#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
docker compose --env-file .env -f compose.observability.yaml ps
docker compose --env-file .env -f compose.observability.yaml logs --tail=80 prometheus grafana alertmanager tempo loki promtail
