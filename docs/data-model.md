# Data Model

## Storage Modes
Backend mendukung dua mode persistence:

1. JSON file mode (`DATABASE_URL` kosong)
   - Path default: `backend/data/state.json`
   - Bisa diubah via `OCC_JTT_DATA`
2. PostgreSQL mode (`DATABASE_URL` diisi)
   - Runtime store menggunakan tabel `occ_state` (single-row JSONB snapshot)

## Canonical Runtime State
Model inti ada di `backend/internal/store/store.go`:

```go
type State struct {
  Network NetworkConfig `json:"network"`
  Peers   []Peer        `json:"peers"`
  Users   []User        `json:"users"`
  Logs    []AuditLog    `json:"logs"`
}
```

## NetworkConfig
```json
{
  "interfaceName": "control-node",
  "serverAddress": "managed-remotely",
  "listenPort": 51820,
  "serverPublicKey": "replace-with-managed-server-public-key",
  "dns": ""
}
```

## Peer Model
Site peer dan administrator peer berbagi model yang sama.

```json
{
  "id": "site-1741170000",
  "type": "site",
  "siteName": "CABIN-BOGOR",
  "name": "Site - CABIN-BOGOR",
  "createdBy": "admin",
  "createdByName": "Administrator",
  "publicKey": "...",
  "presharedKey": "...",
  "allowedIPs": ["0.0.0.0/0"],
  "endpoint": "",
  "keepalive": 15,
  "assignedIP": "10.22.0.12",
  "assignments": [
    {
      "serverId": "stg-its",
      "serverName": "stg-its",
      "interfaceName": "wg-its",
      "assignedIP": "10.22.0.12",
      "overlayCIDR": "10.22.0.0/22"
    }
  ],
  "artifacts": [
    {
      "id": "stg-its-conf",
      "kind": "conf",
      "serverId": "stg-its",
      "serverName": "stg-its",
      "filename": "cabin-bogor-stg-its.conf",
      "contentType": "text/plain; charset=utf-8",
      "content": "..."
    }
  ],
  "createdAt": "2026-03-05T13:00:00Z"
}
```

Catatan kompatibilitas:
- Legacy peer type `outlet` masih dibaca sebagai site peer saat delete/filter logic.

## User Model
```json
{
  "username": "123456",
  "name": "Support A",
  "nik": "123456",
  "password": "plain-text-current-implementation",
  "role": "support",
  "builtIn": false,
  "createdAt": "2026-03-05T13:00:00Z",
  "updatedAt": "2026-03-05T13:00:00Z"
}
```

Catatan:
- Password saat ini disimpan plaintext di state (belum hashing).

## AuditLog Model
```json
{
  "id": "wireguard-create-site-cabin-bogor-1741170000",
  "category": "wireguard",
  "action": "create",
  "actor": "admin",
  "actorName": "Administrator",
  "target": "Site - CABIN-BOGOR",
  "message": "Created site peer Site - CABIN-BOGOR",
  "createdAt": "2026-03-05T13:00:00Z"
}
```

## PostgreSQL Runtime Table (`occ_state`)
Schema dibuat otomatis oleh store (dan juga tersedia di migration `000002`):

```sql
CREATE TABLE IF NOT EXISTS occ_state (
  id SMALLINT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Baris tunggal `id = 1` menyimpan seluruh object `State` di `payload`.
- Update state dilakukan transactional (`SELECT ... FOR UPDATE`) lalu overwrite JSONB.

## SQL Migrations in Repository

### `000001_init_schema.*`
Menyediakan schema relational ter-normalisasi (`wg_servers`, `users`, `peers`, `peer_assignments`, dll).

### `000002_add_occ_state.*`
Menambahkan tabel `occ_state` (runtime store aktif saat ini).

Status implementasi saat ini:
- Runtime code store tidak membaca tabel normalized `000001`; runtime hanya `occ_state`/JSON file.

## Remote Inventory Data (WireGuard Server Scripts)
Script remote di `server-scripts/` menulis inventory file di host WG:
- `/opt/occ-wg/inventory.json`

Contoh entry (script-generated):
```json
{
  "site": "CABIN-BOGOR",
  "server_id": "stg-cctv",
  "server_name": "stg-cctv",
  "interface": "wg-cctv",
  "assigned_ip": "10.21.0.12",
  "overlay": "10.21.0.0/22",
  "role": "outlet",
  "status": "active",
  "peer_file": "/opt/occ-wg/peers/cabin-bogor-stg-cctv.conf",
  "router_file": "/opt/occ-wg/peers/cabin-bogor-stg-cctv.rsc",
  "updated_at": "2026-03-05T13:00:00Z"
}
```

Inventory ini tidak otomatis disinkronkan kembali ke store backend kecuali melalui output script saat create/delete.
