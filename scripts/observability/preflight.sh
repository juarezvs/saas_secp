#!/usr/bin/env bash
set -euo pipefail

STATUS="APTO"
WARNINGS=()
ERRORS=()
SECP_DB_HOST="${SECP_DB_HOST:-172.19.5.37}"
SECP_DB_PORT="${SECP_DB_PORT:-5432}"

warn() {
  WARNINGS+=("$1")
  if [[ "$STATUS" == "APTO" ]]; then
    STATUS="APTO COM RESSALVAS"
  fi
}

error() {
  ERRORS+=("$1")
  STATUS="NAO RECOMENDADO"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

echo "== SECP observability preflight =="
date -Is

if [[ -r /etc/os-release ]]; then
  . /etc/os-release
  echo "Sistema: ${PRETTY_NAME:-desconhecido}"
else
  warn "Nao foi possivel ler /etc/os-release."
fi

cpu_count="$(nproc 2>/dev/null || echo 0)"
mem_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)"
swap_mb="$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)"
load_1m="$(awk '{print $1}' /proc/loadavg 2>/dev/null || echo 0)"

echo "CPU: ${cpu_count} vCPU"
echo "Memoria: ${mem_mb} MB"
echo "Swap: ${swap_mb} MB"
echo "Load 1m: ${load_1m}"

if (( cpu_count < 2 )); then warn "Menos de 2 vCPU disponiveis."; fi
if (( mem_mb < 4096 )); then warn "Menos de 4GB de memoria total."; fi
if (( swap_mb == 0 )); then warn "Swap ausente."; fi

if ! has_cmd docker; then
  error "Docker nao encontrado."
else
  docker version --format 'Docker: {{.Server.Version}}' || error "Docker nao responde."
fi

if ! docker compose version >/dev/null 2>&1; then
  error "Docker Compose v2 nao encontrado."
else
  docker compose version
fi

if mount | awk '$3=="/" && $6 ~ /(^|,)ro(,|$)/ {found=1} END {exit !found}'; then
  error "Filesystem raiz esta montado como somente leitura."
fi

if [[ ! -d /srv/observability ]]; then
  warn "/srv/observability ainda nao existe."
else
  df -h /srv/observability
  df -ih /srv/observability || true
fi

for dir in prometheus grafana alertmanager tempo loki; do
  if [[ ! -d "/srv/observability/${dir}" ]]; then
    warn "/srv/observability/${dir} ainda nao existe."
  fi
done

root_dev="$(df -P / | awk 'NR==2 {print $1}')"
obs_dev="$(df -P /srv/observability 2>/dev/null | awk 'NR==2 {print $1}' || true)"
if [[ -n "${obs_dev}" && "${obs_dev}" == "${root_dev}" && "${ALLOW_SHARED_ROOT_FS:-false}" != "true" ]]; then
  warn "/srv/observability esta no mesmo filesystem da raiz. Defina ALLOW_SHARED_ROOT_FS=true apenas se aceitar esse risco."
fi

for port in 3000 3001 3100 9090 9093 9100 9121 9187; do
  if ss -ltn "( sport = :${port} )" 2>/dev/null | grep -q ":${port}"; then
    warn "Porta ${port} ja esta em uso."
  fi
done

if docker network inspect "${SECP_DOCKER_NETWORK:-secp-prod_secp-network}" >/dev/null 2>&1; then
  echo "Rede SECP encontrada: ${SECP_DOCKER_NETWORK:-secp-prod_secp-network}"
else
  warn "Rede Docker do SECP nao encontrada: ${SECP_DOCKER_NETWORK:-secp-prod_secp-network}"
fi

if docker ps --format '{{.Names}}' | grep -Eq '^secp-(web|pgbouncer|redis)$'; then
  docker ps --filter 'name=secp-' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
else
  warn "Containers secp-web/secp-pgbouncer/secp-redis nao foram encontrados em execucao."
fi

if has_cmd nc; then
  if nc -z -w 3 "${SECP_DB_HOST}" "${SECP_DB_PORT}"; then
    echo "Banco remoto alcancavel: ${SECP_DB_HOST}:${SECP_DB_PORT}"
  else
    warn "Banco remoto nao respondeu em ${SECP_DB_HOST}:${SECP_DB_PORT}."
  fi
else
  warn "nc nao encontrado; nao foi possivel testar ${SECP_DB_HOST}:${SECP_DB_PORT}."
fi

if has_cmd caddy; then
  caddy version || true
else
  warn "Caddy nao encontrado no PATH. Se houver proxy externo, documente fora do host."
fi

echo
echo "Resultado: ${STATUS}"

if ((${#WARNINGS[@]} > 0)); then
  echo "Ressalvas:"
  printf ' - %s\n' "${WARNINGS[@]}"
fi

if ((${#ERRORS[@]} > 0)); then
  echo "Erros:"
  printf ' - %s\n' "${ERRORS[@]}"
fi

[[ "$STATUS" != "NAO RECOMENDADO" ]]
