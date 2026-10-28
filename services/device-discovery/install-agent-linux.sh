#!/usr/bin/env bash
set -euo pipefail
if [[ "$EUID" -ne 0 || "$#" -ne 1 ]]; then
  echo 'Uso: sudo ./install-agent-linux.sh /caminho/agent.json' >&2
  exit 2
fi
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$(realpath "$1")"
python3 -c 'import sys; assert sys.version_info >= (3,12), "Python 3.12+ obrigatório"'
id secp-discovery >/dev/null 2>&1 || useradd --system --home /var/lib/secp-discovery-agent --shell /usr/sbin/nologin secp-discovery
install -d -m 0755 /opt/secp-discovery-agent
install -d -m 0700 -o secp-discovery -g secp-discovery /var/lib/secp-discovery-agent /etc/secp-discovery-agent
python3 -m venv /opt/secp-discovery-agent/venv
/opt/secp-discovery-agent/venv/bin/pip install -c "$SOURCE_DIR/requirements.lock" "$SOURCE_DIR"
install -m 0600 -o secp-discovery -g secp-discovery "$CONFIG_FILE" /etc/secp-discovery-agent/agent.json
install -m 0644 "$SOURCE_DIR/secp-discovery-agent.service" /etc/systemd/system/secp-discovery-agent.service
systemctl daemon-reload
echo 'Instalado. Configure state_dir=/var/lib/secp-discovery-agent e o bootstrap.env (0600), depois execute: systemctl enable --now secp-discovery-agent'
