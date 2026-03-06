#!/usr/bin/env bash

set -uo pipefail

SERVER_ID="stg-its"
SERVER_NAME="stg-its"
INTERFACE_NAME="wg-its"
OVERLAY_CIDR="10.21.0.0/22"
POOL_BASE="10.21"
WG_CONF="/etc/wireguard/wg0.conf"
PEERS_DIR="/opt/occ-wg/peers"
INVENTORY_JSON="/opt/occ-wg/inventory.json"
LOCK_FILE="/opt/occ-wg/.lock"

SITE_ARG=""

json_ok() {
  jq -nc \
    --arg site "$1" \
    --arg server_id "$SERVER_ID" \
    --arg interface "$INTERFACE_NAME" \
    --arg assigned_ip "$2" \
    --arg overlay "$OVERLAY_CIDR" \
    --arg peer_file "$3" \
    --arg router_file "$4" \
    --rawfile peer_content "$3" \
    --rawfile router_content "$4" \
    '{
      ok: true,
      site: $site,
      server_id: $server_id,
      interface: $interface,
      assigned_ip: $assigned_ip,
      overlay: $overlay,
      peer_file: $peer_file,
      router_file: $router_file,
      peer_content: $peer_content,
      router_content: $router_content,
      applied: true
    }'
}

fail() {
  local message="$1"
  jq -nc --arg error "$message" --arg server_id "$SERVER_ID" '{ok:false,error:$error,server_id:$server_id}'
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  occ-wg-create-peer.sh --site OUTLET-A
EOF
}

need_bin() {
  command -v "$1" >/dev/null 2>&1 || fail "missing dependency: $1"
}

sanitize_site() {
  printf "%s" "$1" | sed 's/[^0-9A-Za-z_-]/-/g' | tr '[:lower:]' '[:upper:]' | cut -c-48
}

ensure_env() {
  need_bin wg
  need_bin wg-quick
  need_bin jq
  need_bin flock
  need_bin awk
  need_bin sed
  need_bin mktemp
  mkdir -p "$PEERS_DIR" "$(dirname "$INVENTORY_JSON")"
  [[ -f "$WG_CONF" ]] || fail "wg config not found: $WG_CONF"
  [[ -f "$INVENTORY_JSON" ]] || printf '[]\n' > "$INVENTORY_JSON"
}

peer_exists() {
  local site="$1"
  grep -q "^# BEGIN_PEER ${site}$" "$WG_CONF"
}

inventory_has_ip() {
  local ip="$1"
  jq -e --arg ip "$ip" '.[] | select(.assigned_ip == $ip)' "$INVENTORY_JSON" >/dev/null 2>&1
}

wg_has_ip() {
  local ip="$1"
  grep -q "^[[:space:]]*AllowedIPs[[:space:]]*=[[:space:]]*${ip}/32[[:space:]]*$" "$WG_CONF"
}

next_free_ip() {
  local third fourth candidate
  for third in 0 1 2; do
    for fourth in $(seq 2 254); do
      candidate="${POOL_BASE}.${third}.${fourth}"
      inventory_has_ip "$candidate" || wg_has_ip "$candidate" || { printf "%s\n" "$candidate"; return 0; }
    done
  done
  return 1
}

server_public_key() {
  local priv
  priv="$(awk '/^[[:space:]]*PrivateKey[[:space:]]*=/{print $3; exit}' "$WG_CONF")"
  [[ -n "$priv" ]] || fail "server private key not found in $WG_CONF"
  printf "%s" "$priv" | wg pubkey
}

endpoint_value() {
  local endpoint
  endpoint="$(awk '/^[[:space:]]*#[[:space:]]*ENDPOINT/{print $3; exit}' "$WG_CONF")"
  if [[ -n "$endpoint" ]]; then
    printf "%s\n" "$endpoint"
    return
  fi
  hostname -I | awk '{print $1}'
}

listen_port() {
  local port
  port="$(awk '/^[[:space:]]*ListenPort[[:space:]]*=/{print $3; exit}' "$WG_CONF")"
  [[ -n "$port" ]] || port="51820"
  printf "%s\n" "$port"
}

generate_private_key() {
  wg genkey
}

generate_public_key() {
  printf "%s" "$1" | wg pubkey
}

generate_psk() {
  wg genpsk
}

write_inventory() {
  local site="$1" ip="$2" peer_file="$3" router_file="$4"
  local tmp
  tmp="$(mktemp)"
  jq \
    --arg site "$site" \
    --arg server_id "$SERVER_ID" \
    --arg server_name "$SERVER_NAME" \
    --arg interface "$INTERFACE_NAME" \
    --arg assigned_ip "$ip" \
    --arg overlay "$OVERLAY_CIDR" \
    --arg peer_file "$peer_file" \
    --arg router_file "$router_file" \
    --arg updated_at "$(date -u +%FT%TZ)" \
    '
      (map(select(.site != $site or .server_id != $server_id))) +
      [{
        site: $site,
        server_id: $server_id,
        server_name: $server_name,
        interface: $interface,
        assigned_ip: $assigned_ip,
        overlay: $overlay,
        role: "outlet",
        status: "active",
        peer_file: $peer_file,
        router_file: $router_file,
        updated_at: $updated_at
      }]
    ' "$INVENTORY_JSON" > "$tmp" || fail "failed to update inventory"
  mv "$tmp" "$INVENTORY_JSON"
}

write_peer_metadata() {
  local meta_file="$1" site="$2" ip="$3" peer_file="$4" router_file="$5"
  local tmp
  tmp="$(mktemp)"
  jq -nc \
    --arg site "$site" \
    --arg server_id "$SERVER_ID" \
    --arg server_name "$SERVER_NAME" \
    --arg interface "$INTERFACE_NAME" \
    --arg assigned_ip "$ip" \
    --arg overlay "$OVERLAY_CIDR" \
    --arg peer_file "$peer_file" \
    --arg router_file "$router_file" \
    --arg updated_at "$(date -u +%FT%TZ)" \
    '{
      site: $site,
      server_id: $server_id,
      server_name: $server_name,
      interface: $interface,
      assigned_ip: $assigned_ip,
      overlay: $overlay,
      role: "outlet",
      status: "active",
      peer_file: $peer_file,
      router_file: $router_file,
      updated_at: $updated_at
    }' > "$tmp" || fail "failed to build peer metadata"
  mv "$tmp" "$meta_file"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --site)
      SITE_ARG="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
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

peer_exists "$SITE_NAME" && fail "peer already exists"

ASSIGNED_IP="$(next_free_ip)" || fail "no available IP in pool ${POOL_BASE}.0.2-${POOL_BASE}.2.254"
PRIVATE_KEY="$(generate_private_key)" || fail "failed to generate private key"
PUBLIC_KEY="$(generate_public_key "$PRIVATE_KEY")" || fail "failed to derive public key"
PRESHARED_KEY="$(generate_psk)" || fail "failed to generate preshared key"
SERVER_PUBLIC_KEY="$(server_public_key)"
ENDPOINT="$(endpoint_value)"
LISTEN_PORT="$(listen_port)"

SAFE_SITE="$(printf "%s" "$SITE_NAME" | tr '[:upper:]' '[:lower:]')"
PEER_FILE="${PEERS_DIR}/${SAFE_SITE}-${SERVER_ID}.conf"
ROUTER_FILE="${PEERS_DIR}/${SAFE_SITE}-${SERVER_ID}.rsc"
META_FILE="${PEERS_DIR}/${SAFE_SITE}-${SERVER_ID}.json"
BACKUP_FILE="$(mktemp "${WG_CONF}.bak.XXXXXX")" || fail "failed to create backup"

cp "$WG_CONF" "$BACKUP_FILE" || fail "failed to backup wg config"

cat <<EOF >> "$WG_CONF"
# BEGIN_PEER ${SITE_NAME}
[Peer]
PublicKey = ${PUBLIC_KEY}
PresharedKey = ${PRESHARED_KEY}
AllowedIPs = ${ASSIGNED_IP}/32
# END_PEER ${SITE_NAME}
EOF

cat <<EOF > "$PEER_FILE"
[Interface]
Address = ${ASSIGNED_IP}/22
PrivateKey = ${PRIVATE_KEY}

[Peer]
PublicKey = ${SERVER_PUBLIC_KEY}
PresharedKey = ${PRESHARED_KEY}
AllowedIPs = ${OVERLAY_CIDR}
Endpoint = ${ENDPOINT}:${LISTEN_PORT}
PersistentKeepalive = 15
EOF

cat <<EOF > "$ROUTER_FILE"
/interface wireguard add name=${INTERFACE_NAME} private-key="${PRIVATE_KEY}"
/ip address add address=${ASSIGNED_IP}/22 interface=${INTERFACE_NAME}
/interface wireguard peers add name=${SITE_NAME} interface=${INTERFACE_NAME} \
public-key="${SERVER_PUBLIC_KEY}" \
preshared-key="${PRESHARED_KEY}" \
endpoint-address=${ENDPOINT} \
endpoint-port=${LISTEN_PORT} \
allowed-address=${OVERLAY_CIDR}
EOF

chmod 600 "$PEER_FILE" "$ROUTER_FILE" || fail "failed to set file permissions"

if ! wg syncconf wg0 <(wg-quick strip wg0); then
  cp "$BACKUP_FILE" "$WG_CONF" || true
  wg syncconf wg0 <(wg-quick strip wg0) >/dev/null 2>&1 || true
  fail "failed to apply wireguard config; rolled back"
fi

write_peer_metadata "$META_FILE" "$SITE_NAME" "$ASSIGNED_IP" "$PEER_FILE" "$ROUTER_FILE"
write_inventory "$SITE_NAME" "$ASSIGNED_IP" "$PEER_FILE" "$ROUTER_FILE"

json_ok "$SITE_NAME" "$ASSIGNED_IP" "$PEER_FILE" "$ROUTER_FILE"
