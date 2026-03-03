#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="${SERVICE_NAME:-occ-jtt}"
GO_CACHE_DIR="${GOCACHE:-/tmp/occ-jtt-go-cache}"
APP_PORT="${PORT:-8080}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${APP_PORT}/api/healthz}"
DATA_PATH="${OCC_JTT_DATA:-data/state.json}"
ABS_DATA_PATH="${ROOT_DIR}/backend/${DATA_PATH}"

SKIP_PULL="false"
SKIP_INSTALL="false"
SKIP_HEALTHCHECK="false"

usage() {
  cat <<'EOF'
Usage: bash deploy.sh [options]

Options:
  --skip-pull         Skip git pull
  --skip-install      Skip npm install
  --skip-healthcheck  Skip curl health check
  -h, --help          Show this help

Environment overrides:
  SERVICE_NAME  systemd service name (default: occ-jtt)
  GOCACHE       go build cache dir (default: /tmp/occ-jtt-go-cache)
  PORT          port used for health check (default: 8080)
  HEALTH_URL    full health endpoint URL (default: http://127.0.0.1:${PORT}/api/healthz)
EOF
}

log() {
  printf '\n==> %s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

for arg in "$@"; do
  case "$arg" in
    --skip-pull)
      SKIP_PULL="true"
      ;;
    --skip-install)
      SKIP_INSTALL="true"
      ;;
    --skip-healthcheck)
      SKIP_HEALTHCHECK="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $arg" >&2
      usage
      exit 1
      ;;
  esac
done

require_command git
require_command go
require_command npm
require_command sudo
require_command systemctl
require_command ss

mkdir -p "${GO_CACHE_DIR}"

if [[ "${SKIP_PULL}" != "true" ]]; then
  log "Pulling latest source"
  (
    cd "${ROOT_DIR}"
    git pull --ff-only
  )
fi

log "Building frontend"
(
  cd "${ROOT_DIR}/frontend"
  if [[ "${SKIP_INSTALL}" != "true" ]]; then
    npm install
  fi
  npm run build
)

log "Building backend"
(
  cd "${ROOT_DIR}/backend"
  GOCACHE="${GO_CACHE_DIR}" go build -o occ-jtt
)

log "Restarting ${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl status "${SERVICE_NAME}" --no-pager

log "Showing recent service logs"
sudo journalctl -u "${SERVICE_NAME}" -n 20 --no-pager

log "Verifying port ${APP_PORT} is listening"
ss -ltn | grep -F ":${APP_PORT} " >/dev/null
ss -ltn | grep -F ":${APP_PORT} "

log "Checking state file"
mkdir -p "$(dirname "${ABS_DATA_PATH}")"
if [[ ! -e "${ABS_DATA_PATH}" ]]; then
  touch "${ABS_DATA_PATH}"
fi

if [[ ! -w "${ABS_DATA_PATH}" ]]; then
  echo "state file is not writable: ${ABS_DATA_PATH}" >&2
  exit 1
fi

ls -lah "${ABS_DATA_PATH}"

if [[ "${SKIP_HEALTHCHECK}" != "true" ]]; then
  require_command curl
  log "Checking health endpoint"
  curl --fail --silent --show-error "${HEALTH_URL}"
  printf '\n'
fi

log "Deploy finished"
