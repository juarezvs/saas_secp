#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
dest="/srv/observability/backups/config-$(date +%Y%m%d%H%M%S).tar.gz"
mkdir -p "$(dirname "$dest")"
tar --exclude='./secrets' --exclude='./.env' -czf "$dest" .
echo "$dest"

