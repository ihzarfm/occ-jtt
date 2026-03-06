#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""

cleanup() {
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [[ ! -d "${ROOT_DIR}/frontend/node_modules" ]]; then
  echo "frontend dependencies not found. Run: cd frontend && npm install"
  exit 1
fi

GO_CACHE_DIR="${GOCACHE:-${ROOT_DIR}/.cache/go-build}"
DEFAULT_SSH_KEY_PATH="/home/raph/.ssh/id_ed25519"

export STG_CCTV_SSH_KEY_PATH="${STG_CCTV_SSH_KEY_PATH:-${DEFAULT_SSH_KEY_PATH}}"
export STG_ITS_SSH_KEY_PATH="${STG_ITS_SSH_KEY_PATH:-${DEFAULT_SSH_KEY_PATH}}"

mkdir -p "${GO_CACHE_DIR}"

SYNC_STATE_PATH="${ROOT_DIR}/backups/state.json"
export OCC_JTT_DATA="${OCC_JTT_DATA:-${SYNC_STATE_PATH}}"

echo "using stg-cctv ssh key: ${STG_CCTV_SSH_KEY_PATH}"
echo "using stg-its ssh key: ${STG_ITS_SSH_KEY_PATH}"
echo "using app state file: ${OCC_JTT_DATA}"

echo "building frontend"
(
  cd "${ROOT_DIR}/frontend"
  npm run build
)

echo "running backend tests"
(
  cd "${ROOT_DIR}/backend"
  GOCACHE="${GO_CACHE_DIR}" go test ./...
)

echo "starting backend on http://localhost:8080"
(
  cd "${ROOT_DIR}/backend"
  exec go run .
) &
BACKEND_PID=$!

echo "app is available at http://localhost:8080"
wait "${BACKEND_PID}"
