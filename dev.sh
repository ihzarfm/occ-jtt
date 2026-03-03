#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi

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

echo "using stg-cctv ssh key: ${STG_CCTV_SSH_KEY_PATH}"
echo "using stg-its ssh key: ${STG_ITS_SSH_KEY_PATH}"

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

echo "starting frontend on http://localhost:5173"
(
  cd "${ROOT_DIR}/frontend"
  exec npm run dev -- --host 0.0.0.0
) &
FRONTEND_PID=$!

wait -n "${BACKEND_PID}" "${FRONTEND_PID}"
