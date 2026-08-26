<#
Uso:
  $env:SECP_PROD_SSH_PASSWORD = "senha-do-ssh"
  .\scripts\deploy-producao.ps1

O script:
  - empacota o codigo local sem .env, node_modules, .next, .tmp, backups e artefatos tar.gz;
  - envia o pacote para o Ubuntu de producao;
  - cria backup da release atual;
  - preserva .env.production e segredos operacionais da release atual;
  - executa build, migrations e seed sem resetar o banco;
  - publica somente o container secp-web;
  - valida /api/ready e a confiabilidade da CA interna do TRF1 no container;
  - mantem apenas os 2 backups/deploys mais recentes por padrao.
#>

param(
  [string]$HostName = "172.19.5.244",
  [string]$SshUser = "nutec",
  [string]$RemoteRoot = "/opt/secp",
  [string]$AppVersion = "",
  [int]$RetainBackups = 2,
  [string]$SshPassword = $env:SECP_PROD_SSH_PASSWORD,
  [switch]$SkipSeed,
  [switch]$KeepLocalArchive
)

$ErrorActionPreference = "Stop"

function Assert-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando obrigatorio nao encontrado no PATH: $Name"
  }
}

function Invoke-Ssh {
  param([string]$Command)

  $sshArgs = @(
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "$SshUser@$HostName",
    $Command
  )

  if ($SshPassword) {
    & sshpass -p $SshPassword ssh @sshArgs
  } else {
    & ssh @sshArgs
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar comando remoto."
  }
}

function Invoke-Scp {
  param(
    [string]$Source,
    [string]$Destination
  )

  $scpArgs = @(
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    $Source,
    "$SshUser@$HostName`:$Destination"
  )

  if ($SshPassword) {
    & sshpass -p $SshPassword scp @scpArgs
  } else {
    & scp @scpArgs
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao copiar arquivo para o servidor."
  }
}

Assert-Command "ssh"
Assert-Command "scp"
Assert-Command "tar"

if ($SshPassword) {
  Assert-Command "sshpass"
}

if ($RetainBackups -lt 1) {
  throw "RetainBackups deve ser maior ou igual a 1."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

if (-not (Test-Path "compose.prod.yaml")) {
  throw "compose.prod.yaml nao encontrado em $repoRoot."
}

if (-not (Test-Path "Dockerfile")) {
  throw "Dockerfile nao encontrado em $repoRoot."
}

if (-not (Test-Path "docker/certs/trf1-ac-raiz.crt")) {
  throw "CA interna do TRF1 nao encontrada em docker/certs/trf1-ac-raiz.crt."
}

if (-not $AppVersion) {
  $AppVersion = "prod_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
}

if ($AppVersion -notmatch "^[A-Za-z0-9_.-]+$") {
  throw "AppVersion deve conter apenas letras, numeros, ponto, underline ou hifen."
}

$archiveName = "secp-deploy-$AppVersion.tar.gz"
$archivePath = Join-Path $repoRoot $archiveName
$remoteArchive = "$RemoteRoot/deploys/$archiveName"
$remoteScript = "/tmp/secp-prod-deploy-$AppVersion.sh"

if (Test-Path $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

Write-Host "==> Gerando pacote local $archiveName"
& tar `
  --exclude=.git `
  --exclude=node_modules `
  --exclude=.next `
  --exclude=dist `
  --exclude=backups `
  --exclude=import `
  --exclude=files_afd `
  --exclude=.storage `
  --exclude=.tmp `
  --exclude=tmp `
  --exclude=output `
  --exclude=coverage `
  --exclude=observability/secrets `
  --exclude=.env `
  --exclude=.env.* `
  --exclude=*.tar.gz `
  --exclude=secp-deploy-*.tar.gz `
  -czf $archivePath .

if ($LASTEXITCODE -ne 0) {
  throw "Falha ao gerar pacote local."
}

$archiveSizeMb = [math]::Round((Get-Item $archivePath).Length / 1MB, 2)
Write-Host "==> Pacote criado: $archiveName ($archiveSizeMb MB)"

$seedFlag = if ($SkipSeed) { "0" } else { "1" }

$remoteDeployScript = @'
#!/usr/bin/env bash
set -Eeuo pipefail

APP_VERSION="$1"
REMOTE_ARCHIVE="$2"
REMOTE_ROOT="$3"
RETAIN_BACKUPS="$4"
RUN_SEED="$5"

RELEASE_NAME="secp-app-${APP_VERSION}"
RELEASE_DIR="${REMOTE_ROOT}/releases/${RELEASE_NAME}"
CURRENT_LINK="${REMOTE_ROOT}/secp-app"
BACKUP_DIR="${REMOTE_ROOT}/backups"
DEPLOY_DIR="${REMOTE_ROOT}/deploys"

log() {
  printf '\n==> %s\n' "$*"
}

keep_latest() {
  local pattern="$1"
  local keep="$2"
  local files

  files="$(ls -1t $pattern 2>/dev/null || true)"
  if [[ -n "$files" ]]; then
    printf '%s\n' "$files" | tail -n +"$((keep + 1))" | xargs -r rm -f
  fi
}

log "Preparando diretorios"
mkdir -p "$BACKUP_DIR" "$DEPLOY_DIR" "${REMOTE_ROOT}/releases"

if [[ ! -f "$REMOTE_ARCHIVE" ]]; then
  echo "Pacote nao encontrado: $REMOTE_ARCHIVE" >&2
  exit 2
fi

if [[ ! -f "${REMOTE_ROOT}/certs/host-ca-certificates.crt" ]]; then
  echo "Bundle de CA do host nao encontrado: ${REMOTE_ROOT}/certs/host-ca-certificates.crt" >&2
  exit 2
fi

if [[ -e "$CURRENT_LINK" ]]; then
  CURRENT_RELEASE="$(readlink -f "$CURRENT_LINK" || true)"
  if [[ -n "$CURRENT_RELEASE" && -d "$CURRENT_RELEASE" ]]; then
    BACKUP_FILE="${BACKUP_DIR}/secp-app-before-${APP_VERSION}.tar.gz"
    log "Gerando backup da release atual em $BACKUP_FILE"
    tar -C "$(dirname "$CURRENT_RELEASE")" -czf "$BACKUP_FILE" "$(basename "$CURRENT_RELEASE")"
  fi
fi

log "Extraindo nova release em $RELEASE_DIR"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$REMOTE_ARCHIVE" -C "$RELEASE_DIR"

if [[ -f "${CURRENT_LINK}/.env.production" ]]; then
  cp "${CURRENT_LINK}/.env.production" "${RELEASE_DIR}/.env.production"
elif [[ -f "${REMOTE_ROOT}/.env.production" ]]; then
  cp "${REMOTE_ROOT}/.env.production" "${RELEASE_DIR}/.env.production"
else
  echo ".env.production nao encontrado na release atual nem em ${REMOTE_ROOT}" >&2
  exit 2
fi

if [[ -d "${CURRENT_LINK}/observability/secrets" ]]; then
  mkdir -p "${RELEASE_DIR}/observability"
  cp -a "${CURRENT_LINK}/observability/secrets" "${RELEASE_DIR}/observability/"
elif [[ -d "${REMOTE_ROOT}/observability/secrets" ]]; then
  mkdir -p "${RELEASE_DIR}/observability"
  cp -a "${REMOTE_ROOT}/observability/secrets" "${RELEASE_DIR}/observability/"
fi

if [[ ! -f "${RELEASE_DIR}/docker/certs/trf1-ac-raiz.crt" ]]; then
  echo "CA interna do TRF1 ausente na nova release: docker/certs/trf1-ac-raiz.crt" >&2
  exit 2
fi

if [[ ! -f "${RELEASE_DIR}/observability/secrets/secp_metrics_token" ]]; then
  echo "Segredo de metricas nao encontrado na nova release: observability/secrets/secp_metrics_token" >&2
  exit 2
fi

cd "$RELEASE_DIR"
export APP_VERSION

log "Construindo imagens web/migrate/seed"
docker compose --env-file .env.production -f compose.prod.yaml build web migrate seed

log "Aplicando migrations sem resetar o banco"
docker compose --env-file .env.production -f compose.prod.yaml run --rm migrate

if [[ "$RUN_SEED" == "1" ]]; then
  log "Executando seed"
  docker compose --env-file .env.production -f compose.prod.yaml run --rm seed
else
  log "Seed ignorado por parametro"
fi

log "Ativando release"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

cd "$CURRENT_LINK"
export APP_VERSION

log "Subindo somente o secp-web"
docker compose --env-file .env.production -f compose.prod.yaml up -d --no-deps web

log "Aguardando prontidao"
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/ready >/tmp/secp-ready.out 2>/tmp/secp-ready.err; then
    cat /tmp/secp-ready.out
    printf '\n'
    break
  fi

  if [[ "$attempt" == "30" ]]; then
    echo "Aplicacao nao ficou pronta." >&2
    cat /tmp/secp-ready.err >&2 || true
    docker logs --tail=160 secp-web >&2 || true
    exit 3
  fi

  sleep 2
done

log "Validando container e CA do TRF1"
docker ps --filter name=secp-web
docker inspect secp-web --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -q '^NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/trf1-ac-raiz.crt$'
docker exec secp-web test -s /usr/local/share/ca-certificates/trf1-ac-raiz.crt
docker exec secp-web test -s /etc/secp/certs/host-ca-certificates.crt

log "Aplicando retencao de backups: ultimos ${RETAIN_BACKUPS}"
keep_latest "${BACKUP_DIR}/secp-app-before-*.tar.gz" "$RETAIN_BACKUPS"
keep_latest "${DEPLOY_DIR}/secp-deploy-*.tar.gz" "$RETAIN_BACKUPS"
keep_latest "${REMOTE_ROOT}/secp-*.tar.gz" "$RETAIN_BACKUPS"

log "Backups restantes"
ls -1t "${BACKUP_DIR}"/secp-app-before-*.tar.gz 2>/dev/null || true
ls -1t "${DEPLOY_DIR}"/secp-deploy-*.tar.gz 2>/dev/null || true
ls -1t "${REMOTE_ROOT}"/secp-*.tar.gz 2>/dev/null || true

log "Deploy concluido"
'@

$localRemoteScript = Join-Path $env:TEMP "secp-prod-deploy-$AppVersion.sh"
[System.IO.File]::WriteAllText(
  $localRemoteScript,
  $remoteDeployScript,
  [System.Text.UTF8Encoding]::new($false)
)

try {
  Write-Host "==> Criando diretorio remoto de deploy"
  Invoke-Ssh "mkdir -p '$RemoteRoot/deploys' '$RemoteRoot/backups' '$RemoteRoot/releases'"

  Write-Host "==> Enviando pacote para $HostName`:$remoteArchive"
  Invoke-Scp $archivePath $remoteArchive

  Write-Host "==> Enviando script remoto para $remoteScript"
  Invoke-Scp $localRemoteScript $remoteScript

  Write-Host "==> Executando deploy remoto"
  Invoke-Ssh "bash '$remoteScript' '$AppVersion' '$remoteArchive' '$RemoteRoot' '$RetainBackups' '$seedFlag'"
} finally {
  if (Test-Path $localRemoteScript) {
    Remove-Item -LiteralPath $localRemoteScript -Force
  }

  if ((Test-Path $archivePath) -and -not $KeepLocalArchive) {
    Remove-Item -LiteralPath $archivePath -Force
  }
}

Write-Host ""
Write-Host "Deploy de producao finalizado com sucesso."
Write-Host "Versao publicada: secp-web:$AppVersion"
