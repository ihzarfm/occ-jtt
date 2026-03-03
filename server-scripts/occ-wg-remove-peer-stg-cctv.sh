#!/usr/bin/env bash

set -uo pipefail

SERVER_ID="stg-cctv"
WG_CONF="/etc/wireguard/wg0.conf"
PEERS_DIR="/opt/occ-wg/peers"
INVENTORY_JSON="/opt/occ-wg/inventory.json"
LOCK_FILE="/opt/occ-wg/.lock"

SITE_ARG=""

json_ok() {
  jq -nc --arg site "$1" --arg server_id "$SERVER_ID" '{ok:true,site:$site,server_id:$server_id,removed:true,applied:true}'
}

fail() {
  local message="$1"
  jq -nc --arg error "$message" --arg server_id "$SERVER_ID" '{ok:false,error:$error,server_id:$server_id}'
  exit 1
}

sanitize_site() {
  printf "%s" "$1" | sed 's/[^0-9A-Za-z_-]/-/g' | tr '[:lower:]' '[:upper:]' | cut -c-48
}

need_bin() {
  command -v "$1" >/dev/null 2>&1 || fail "missing dependency: $1"
}

ensure_env() {
  need_bin wg
  need_bin wg-quick
  need_bin jq
  need_bin flock
  need_bin sed
  need_bin mktemp
  [[ -f "$WG_CONF" ]] || fail "wg config not found: $WG_CONF"
  [[ -f "$INVENTORY_JSON" ]] || printf '[]\n' > "$INVENTORY_JSON"
  mkdir -p "$PEERS_DIR"
}

remove_inventory_entry() {
  local site="$1"
  local tmp
  tmp="$(mktemp)"
  jq --arg site "$site" --arg server_id "$SERVER_ID" 'map(select(.site != $site or .server_id != $server_id))' "$INVENTORY_JSON" > "$tmp" || fail "failed to update inventory"
  mv "$tmp" "$INVENTORY_JSON"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --site)
      SITE_ARG="${2:-}"
      shift 2
      ;;
    -h|--help)
      exit 0
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

ensure_env

[[ -n "$SITE_ARG" ]] || fail "--site is required"
SITE_NAME="$(sanitize_site "$SITE_ARG")"
[[ -n "$SITE_NAME" ]] || fail "invalid site name"

exec 9>"$LOCK_FILE"
flock -x 9 || fail "failed to acquire lock"

grep -q "^# BEGIN_PEER ${SITE_NAME}$" "$WG_CONF" || fail "peer not found"

BACKUP_FILE="$(mktemp "${WG_CONF}.bak.XXXXXX")" || fail "failed to create backup"
cp "$WG_CONF" "$BACKUP_FILE" || fail "failed to backup wg config"

sed -i "/^# BEGIN_PEER ${SITE_NAME}$/,/^# END_PEER ${SITE_NAME}$/d" "$WG_CONF" || fail "failed to remove peer block"

if ! wg syncconf wg0 <(wg-quick strip wg0); then
  cp "$BACKUP_FILE" "$WG_CONF" || true
  wg syncconf wg0 <(wg-quick strip wg0) >/dev/null 2>&1 || true
  fail "failed to apply wireguard config; rolled back"
fi

SAFE_SITE="$(printf "%s" "$SITE_NAME" | tr '[:upper:]' '[:lower:]')"
rm -f "${PEERS_DIR}/${SAFE_SITE}-${SERVER_ID}.conf" "${PEERS_DIR}/${SAFE_SITE}-${SERVER_ID}.rsc" "${PEERS_DIR}/${SAFE_SITE}-${SERVER_ID}.json"
remove_inventory_entry "$SITE_NAME"

json_ok "$SITE_NAME"
